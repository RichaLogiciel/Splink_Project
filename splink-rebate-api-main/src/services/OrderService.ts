import { col, fn, Op } from "sequelize";
import { ENTITY_TYPE, ORDER_STATUS } from "../config/appConstants";
import sequelize from "../db";
import Distributor from "../models/Distributor";
import Manufacturer from "../models/Manufacturer";
import Order from "../models/Order";
import OrderItem from "../models/OrderItem";
import Product from "../models/Product";
import CartRepository from "../repositories/CartRepository";
import { getProductCodeMappingInclude } from "../utils/helpers";

interface CreateOrderData {
  creatorId: number;
  creatorType: string;
  approverId: number;
  approverType: string;
}

interface UpdateOrderStatusData {
  orderId: number;
  status: string;
  approverId: number;
  approverType: string;
}

class OrderService {
  public async createOrder(data: CreateOrderData) {
    const transaction = await sequelize.transaction();

    try {
      // Get cart items for the creator
      const cartItems = await CartRepository.getAllCartItems(
        data.creatorId,
        data.creatorType
      );

      if (!cartItems || cartItems.length === 0) {
        throw new Error("No items in cart");
      }

      // Group cart items by entity
      const entityGroups = cartItems.reduce(
        (groups, item) => {
          const key = `${item.entityId}-${item.entityType}`;
          if (!groups[key]) {
            groups[key] = {
              entityId: item.entityId,
              entityType: item.entityType,
              items: []
            };
          }
          groups[key].items.push(item);
          return groups;
        },
        {} as Record<
          string,
          { entityId: number; entityType: string; items: typeof cartItems }
        >
      );

      // Create orders for all entity groups in parallel
      const orders = await Promise.all(
        Object.values(entityGroups).map(async (group) => {
          // Calculate total amount and quantity for this entity's items
          const totalAmount = group.items.reduce((sum, item) => {
            const price = item.Product?.price || 0;
            return sum + price * item.quantity;
          }, 0);
          const totalQuantity = group.items.reduce(
            (sum, item) => sum + item.quantity,
            0
          );

          // Create order for this entity
          const order = await Order.create(
            {
              creatorId: data.creatorId,
              creatorType: data.creatorType,
              approverId: data.approverId,
              approverType: data.approverType,
              entityId: group.entityId,
              entityType: group.entityType,
              status: ORDER_STATUS.PLACED,
              totalAmount: totalAmount,
              quantity: totalQuantity
            },
            { transaction }
          );

          // Create order items for this entity's items
          const orderItems = await OrderItem.bulkCreate(
            group.items.map((item) => ({
              orderId: order.id,
              productId: item.productId,
              manufacturerId: item.manufacturerId,
              distProductId: item.distProductId,
              warehouseId: item.warehouseId,
              splinkProductId: item.splinkProductId,
              price: item.Product?.price || 0,
              quantity: item.quantity,
              quantityType: item.quantityType
            })),
            { transaction }
          );

          return {
            order,
            items: orderItems
          };
        })
      );

      // Remove all cart items after successful order creation
      await CartRepository.emptyCart(data.creatorId, data.creatorType);

      await transaction.commit();

      return orders;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  public async updateOrderStatus(data: UpdateOrderStatusData) {
    const transaction = await sequelize.transaction();

    try {
      // Find the order
      const order = await Order.findByPk(data.orderId);
      if (!order) {
        throw new Error("Order not found");
      }

      // Validate status transition
      const currentStatus = order.status;
      const newStatus = data.status;

      // Define valid status transitions
      const validTransitions: Record<string, string[]> = {
        [ORDER_STATUS.PLACED]: [ORDER_STATUS.COMPLETED],
        [ORDER_STATUS.COMPLETED]: []
      };

      if (!validTransitions[currentStatus]?.includes(newStatus)) {
        throw new Error(
          `Invalid status transition from ${currentStatus} to ${newStatus}`
        );
      }

      // Update order status
      const updatedOrder = await order.update(
        {
          status: newStatus,
          approverId: data.approverId,
          approverType: data.approverType
        },
        { transaction }
      );

      await transaction.commit();

      return updatedOrder;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  public async deleteOrder(orderId: number) {
    const transaction = await sequelize.transaction();

    try {
      // Find the order
      const order = await Order.findByPk(orderId);
      if (!order) {
        throw new Error("Order not found");
      }

      // Check if order can be deleted (only pending or rejected orders can be deleted)
      if (![ORDER_STATUS.PLACED].includes(order.status)) {
        throw new Error(
          `Cannot delete order with status ${order.status}. Only orders with status 'approval_pending' or 'rejected' can be deleted.`
        );
      }

      // Delete order items first (due to foreign key constraint)
      await OrderItem.destroy({
        where: { orderId: orderId },
        transaction
      });

      // Delete the order
      await order.destroy({ transaction });

      await transaction.commit();

      return { message: "Order deleted successfully" };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Get orders for a specific creator
   * @param creatorId ID of the creator
   * @param creatorType Type of the creator
   * @param isReturnApprovalPending If true, returns approval pending orders for approver, else returns created orders
   * @returns Array of orders with their items and product information
   */
  public async getOrders(
    creatorId: number,
    creatorType: string,
    entityId?: number,
    entityType?: string,
    isReturnApprovalPending?: boolean
  ) {
    const whereClause: any = {};

    if (isReturnApprovalPending) {
      // Return approval pending orders for approver
      whereClause.approverId = creatorId;
      whereClause.approverType = creatorType;
      whereClause.status = ORDER_STATUS.PLACED;
    } else {
      // Return orders created by the creator
      whereClause.creatorId = creatorId;
      whereClause.creatorType = creatorType;
    }

    if (entityId && entityType) {
      whereClause.entityId = entityId;
      whereClause.entityType = entityType;
    }

    return Order.findAll({
      where: whereClause,
      order: [["created_at", "DESC"]]
    });
  }

  /**
   * Get detailed information for a specific order
   * @param orderId ID of the order
   * @param creatorId ID of the creator requesting the order
   * @param creatorType Type of the creator requesting the order
   * @returns Order with its items and product information
   */
  public async getOrderDetails(
    orderId: number,
    creatorId: number,
    creatorType: string,
    distributorId: number
  ) {
    const attributes: (string | [any, string])[] = [
      "id",
      "name",
      "brand",
      "size"
    ];

    if (distributorId) {
      // Create CASE statement dynamically based on configuration
      const internalCodeCase: [any, string] = [
        fn("MIN", col("OrderItems->Product->ProductCodeMapping.code")),
        "internal_code"
      ];
      attributes.push(internalCodeCase);

      // Get product name from ProductCodeMapping table
      const productCodeMapName: [any, string] = [
        fn("MIN", col("OrderItems->Product->ProductCodeMapping.product_name")),
        "product_name"
      ];

      attributes.push(productCodeMapName);
    }

    // Get warehouse id from Distributors table if creator type is Sales Rep
    let warehouseId: any;
    if (creatorType === ENTITY_TYPE.DISTRIBUTOR_SALES_REP && creatorId) {
      const distributor = await Distributor.findByPk(creatorId);
      if (distributor?.primaryWarehouseId) {
        warehouseId = distributor?.primaryWarehouseId;
      }
    }

    const order = await Order.findOne({
      where: {
        id: orderId,
        [Op.or]: [
          {
            creatorId: creatorId,
            creatorType: creatorType
          },
          {
            approverId: creatorId,
            approverType: creatorType
          }
        ]
      },
      include: [
        {
          model: OrderItem,
          as: "OrderItems",
          required: true,
          include: [
            {
              model: Product,
              as: "Product",
              attributes,
              required: true,
              on: sequelize.literal(
                `"OrderItems->Product".id = "OrderItems".splink_product_id`
              ),
              include: getProductCodeMappingInclude(distributorId, warehouseId)
            },
            {
              model: Manufacturer,
              as: "Manufacturer",
              attributes: ["name"],
              required: true
            }
          ]
        }
      ],
      group: [
        "Order.id",
        "OrderItems.id",
        "OrderItems->Product.id",
        "OrderItems->Manufacturer.id"
      ]
    });

    return order;
  }
}

export default new OrderService();
