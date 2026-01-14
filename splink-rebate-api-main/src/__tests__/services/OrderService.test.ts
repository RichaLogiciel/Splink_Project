/**
 * OrderService Tests
 *
 * Tests for order management operations
 * Focuses on order creation, status updates, deletion, and retrieval
 */

jest.mock("../../repositories/CartRepository");
jest.mock("../../models/Order");
jest.mock("../../models/OrderItem");

import {
  CART_ITEM_QUANTITY_TYPE,
  ORDER_STATUS
} from "../../config/appConstants";
import sequelize from "../../db";
import Order from "../../models/Order";
import OrderItem from "../../models/OrderItem";
import CartRepository from "../../repositories/CartRepository";
import OrderService from "../../services/OrderService";

describe("OrderService", () => {
  let mockTransaction: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock transaction
    mockTransaction = {
      commit: jest.fn(),
      rollback: jest.fn()
    };

    jest.spyOn(sequelize, "transaction").mockResolvedValue(mockTransaction);
  });

  describe("createOrder", () => {
    const createOrderData = {
      creatorId: 1,
      creatorType: "store",
      approverId: 2,
      approverType: "distributor"
    };

    describe("success cases", () => {
      it("should create order successfully with cart items", async () => {
        // Arrange
        const mockCartItems = [
          {
            id: 1,
            entityId: 100,
            entityType: "store",
            productId: 200,
            manufacturerId: 300,
            quantity: 5,
            quantityType: CART_ITEM_QUANTITY_TYPE.UNIT,
            Product: {
              id: 200,
              name: "Product A",
              price: 10.5
            }
          },
          {
            id: 2,
            entityId: 100,
            entityType: "store",
            productId: 201,
            manufacturerId: 300,
            quantity: 3,
            quantityType: CART_ITEM_QUANTITY_TYPE.BOX,
            Product: {
              id: 201,
              name: "Product B",
              price: 15.0
            }
          }
        ];

        const mockOrder = {
          id: 1,
          creatorId: 1,
          creatorType: "store",
          approverId: 2,
          approverType: "distributor",
          entityId: 100,
          entityType: "store",
          status: ORDER_STATUS.PLACED,
          totalAmount: 97.5,
          quantity: 8
        };

        const mockOrderItems = [
          {
            id: 1,
            orderId: 1,
            productId: 200,
            manufacturerId: 300,
            price: 10.5,
            quantity: 5,
            quantityType: CART_ITEM_QUANTITY_TYPE.UNIT
          },
          {
            id: 2,
            orderId: 1,
            productId: 201,
            manufacturerId: 300,
            price: 15.0,
            quantity: 3,
            quantityType: CART_ITEM_QUANTITY_TYPE.BOX
          }
        ];

        (CartRepository.getAllCartItems as jest.Mock).mockResolvedValue(
          mockCartItems
        );
        (Order.create as jest.Mock).mockResolvedValue(mockOrder);
        (OrderItem.bulkCreate as jest.Mock).mockResolvedValue(mockOrderItems);
        (CartRepository.emptyCart as jest.Mock).mockResolvedValue(undefined);

        // Act
        const result = await OrderService.createOrder(createOrderData);

        // Assert
        expect(CartRepository.getAllCartItems).toHaveBeenCalledWith(1, "store");
        expect(Order.create).toHaveBeenCalledWith(
          {
            creatorId: 1,
            creatorType: "store",
            approverId: 2,
            approverType: "distributor",
            entityId: 100,
            entityType: "store",
            status: ORDER_STATUS.PLACED,
            totalAmount: 97.5,
            quantity: 8
          },
          { transaction: mockTransaction }
        );
        expect(OrderItem.bulkCreate).toHaveBeenCalledWith(
          [
            {
              orderId: 1,
              productId: 200,
              manufacturerId: 300,
              price: 10.5,
              quantity: 5,
              quantityType: CART_ITEM_QUANTITY_TYPE.UNIT
            },
            {
              orderId: 1,
              productId: 201,
              manufacturerId: 300,
              price: 15.0,
              quantity: 3,
              quantityType: CART_ITEM_QUANTITY_TYPE.BOX
            }
          ],
          { transaction: mockTransaction }
        );
        expect(CartRepository.emptyCart).toHaveBeenCalledWith(1, "store");
        expect(mockTransaction.commit).toHaveBeenCalled();
        expect(result).toEqual([
          {
            order: mockOrder,
            items: mockOrderItems
          }
        ]);
      });

      it("should create multiple orders for different entities", async () => {
        // Arrange
        const mockCartItems = [
          {
            id: 1,
            entityId: 100,
            entityType: "store",
            productId: 200,
            manufacturerId: 300,
            quantity: 5,
            quantityType: CART_ITEM_QUANTITY_TYPE.UNIT,
            Product: { id: 200, price: 10.0 }
          },
          {
            id: 2,
            entityId: 101,
            entityType: "store",
            productId: 201,
            manufacturerId: 301,
            quantity: 3,
            quantityType: CART_ITEM_QUANTITY_TYPE.BOX,
            Product: { id: 201, price: 15.0 }
          }
        ];

        const mockOrder1 = { id: 1, entityId: 100, entityType: "store" };
        const mockOrder2 = { id: 2, entityId: 101, entityType: "store" };

        (CartRepository.getAllCartItems as jest.Mock).mockResolvedValue(
          mockCartItems
        );
        (Order.create as jest.Mock)
          .mockResolvedValueOnce(mockOrder1)
          .mockResolvedValueOnce(mockOrder2);
        (OrderItem.bulkCreate as jest.Mock).mockResolvedValue([]);
        (CartRepository.emptyCart as jest.Mock).mockResolvedValue(undefined);

        // Act
        const result = await OrderService.createOrder(createOrderData);

        // Assert
        expect(Order.create).toHaveBeenCalledTimes(2);
        expect(OrderItem.bulkCreate).toHaveBeenCalledTimes(2);
        expect(result).toHaveLength(2);
        expect(result[0].order).toEqual(mockOrder1);
        expect(result[1].order).toEqual(mockOrder2);
      });

      it("should handle products with missing prices gracefully", async () => {
        // Arrange
        const mockCartItems = [
          {
            id: 1,
            entityId: 100,
            entityType: "store",
            productId: 200,
            manufacturerId: 300,
            quantity: 5,
            quantityType: CART_ITEM_QUANTITY_TYPE.UNIT,
            Product: null
          }
        ];

        const mockOrder = { id: 1 };

        (CartRepository.getAllCartItems as jest.Mock).mockResolvedValue(
          mockCartItems
        );
        (Order.create as jest.Mock).mockResolvedValue(mockOrder);
        (OrderItem.bulkCreate as jest.Mock).mockResolvedValue([]);
        (CartRepository.emptyCart as jest.Mock).mockResolvedValue(undefined);

        // Act
        const _result = await OrderService.createOrder(createOrderData);

        // Assert
        expect(Order.create).toHaveBeenCalledWith(
          expect.objectContaining({
            totalAmount: 0,
            quantity: 5
          }),
          { transaction: mockTransaction }
        );
        expect(OrderItem.bulkCreate).toHaveBeenCalledWith(
          [
            expect.objectContaining({
              price: 0
            })
          ],
          { transaction: mockTransaction }
        );
      });
    });

    describe("error cases", () => {
      it("should throw error when cart is empty", async () => {
        // Arrange
        (CartRepository.getAllCartItems as jest.Mock).mockResolvedValue([]);

        // Act & Assert
        await expect(OrderService.createOrder(createOrderData)).rejects.toThrow(
          "No items in cart"
        );
        expect(mockTransaction.rollback).toHaveBeenCalled();
        expect(mockTransaction.commit).not.toHaveBeenCalled();
      });

      it("should throw error when cart items is null", async () => {
        // Arrange
        (CartRepository.getAllCartItems as jest.Mock).mockResolvedValue(null);

        // Act & Assert
        await expect(OrderService.createOrder(createOrderData)).rejects.toThrow(
          "No items in cart"
        );
        expect(mockTransaction.rollback).toHaveBeenCalled();
      });

      it("should rollback transaction on order creation failure", async () => {
        // Arrange
        const mockCartItems = [
          {
            id: 1,
            entityId: 100,
            entityType: "store",
            productId: 200,
            manufacturerId: 300,
            quantity: 5,
            quantityType: CART_ITEM_QUANTITY_TYPE.UNIT,
            Product: { id: 200, price: 10.0 }
          }
        ];

        (CartRepository.getAllCartItems as jest.Mock).mockResolvedValue(
          mockCartItems
        );
        (Order.create as jest.Mock).mockRejectedValue(
          new Error("Database error")
        );

        // Act & Assert
        await expect(OrderService.createOrder(createOrderData)).rejects.toThrow(
          "Database error"
        );
        expect(mockTransaction.rollback).toHaveBeenCalled();
        expect(mockTransaction.commit).not.toHaveBeenCalled();
      });

      it("should rollback transaction on cart clearing failure", async () => {
        // Arrange
        const mockCartItems = [
          {
            id: 1,
            entityId: 100,
            entityType: "store",
            productId: 200,
            manufacturerId: 300,
            quantity: 5,
            quantityType: CART_ITEM_QUANTITY_TYPE.UNIT,
            Product: { id: 200, price: 10.0 }
          }
        ];

        (CartRepository.getAllCartItems as jest.Mock).mockResolvedValue(
          mockCartItems
        );
        (Order.create as jest.Mock).mockResolvedValue({ id: 1 });
        (OrderItem.bulkCreate as jest.Mock).mockResolvedValue([]);
        (CartRepository.emptyCart as jest.Mock).mockRejectedValue(
          new Error("Failed to empty cart")
        );

        // Act & Assert
        await expect(OrderService.createOrder(createOrderData)).rejects.toThrow(
          "Failed to empty cart"
        );
        expect(mockTransaction.rollback).toHaveBeenCalled();
        expect(mockTransaction.commit).not.toHaveBeenCalled();
      });
    });
  });

  describe("updateOrderStatus", () => {
    const updateOrderStatusData = {
      orderId: 1,
      status: ORDER_STATUS.COMPLETED,
      approverId: 2,
      approverType: "distributor"
    };

    describe("success cases", () => {
      it("should update order status successfully", async () => {
        // Arrange
        const mockOrder = {
          id: 1,
          status: ORDER_STATUS.PLACED,
          update: jest.fn().mockResolvedValue({
            id: 1,
            status: ORDER_STATUS.COMPLETED,
            approverId: 2,
            approverType: "distributor"
          })
        };

        (Order.findByPk as jest.Mock).mockResolvedValue(mockOrder);

        // Act
        const result = await OrderService.updateOrderStatus(
          updateOrderStatusData
        );

        // Assert
        expect(Order.findByPk).toHaveBeenCalledWith(1);
        expect(mockOrder.update).toHaveBeenCalledWith(
          {
            status: ORDER_STATUS.COMPLETED,
            approverId: 2,
            approverType: "distributor"
          },
          { transaction: mockTransaction }
        );
        expect(mockTransaction.commit).toHaveBeenCalled();
        expect(result).toEqual({
          id: 1,
          status: ORDER_STATUS.COMPLETED,
          approverId: 2,
          approverType: "distributor"
        });
      });

      it("should allow valid status transition from PLACED to COMPLETED", async () => {
        // Arrange
        const mockOrder = {
          id: 1,
          status: ORDER_STATUS.PLACED,
          update: jest
            .fn()
            .mockResolvedValue({ id: 1, status: ORDER_STATUS.COMPLETED })
        };

        (Order.findByPk as jest.Mock).mockResolvedValue(mockOrder);

        // Act
        await OrderService.updateOrderStatus(updateOrderStatusData);

        // Assert
        expect(mockOrder.update).toHaveBeenCalled();
        expect(mockTransaction.commit).toHaveBeenCalled();
      });
    });

    describe("error cases", () => {
      it("should throw error when order not found", async () => {
        // Arrange
        (Order.findByPk as jest.Mock).mockResolvedValue(null);

        // Act & Assert
        await expect(
          OrderService.updateOrderStatus(updateOrderStatusData)
        ).rejects.toThrow("Order not found");
        expect(mockTransaction.rollback).toHaveBeenCalled();
        expect(mockTransaction.commit).not.toHaveBeenCalled();
      });

      it("should throw error for invalid status transition from COMPLETED", async () => {
        // Arrange
        const mockOrder = {
          id: 1,
          status: ORDER_STATUS.COMPLETED,
          update: jest.fn()
        };

        (Order.findByPk as jest.Mock).mockResolvedValue(mockOrder);

        const invalidUpdateData = {
          ...updateOrderStatusData,
          status: ORDER_STATUS.PLACED
        };

        // Act & Assert
        await expect(
          OrderService.updateOrderStatus(invalidUpdateData)
        ).rejects.toThrow(
          `Invalid status transition from ${ORDER_STATUS.COMPLETED} to ${ORDER_STATUS.PLACED}`
        );
        expect(mockOrder.update).not.toHaveBeenCalled();
        expect(mockTransaction.rollback).toHaveBeenCalled();
      });

      it("should throw error when trying to transition COMPLETED to any status", async () => {
        // Arrange
        const mockOrder = {
          id: 1,
          status: ORDER_STATUS.COMPLETED,
          update: jest.fn()
        };

        (Order.findByPk as jest.Mock).mockResolvedValue(mockOrder);

        // Act & Assert
        await expect(
          OrderService.updateOrderStatus(updateOrderStatusData)
        ).rejects.toThrow(/Invalid status transition/);
        expect(mockTransaction.rollback).toHaveBeenCalled();
      });

      it("should rollback transaction on database error during update", async () => {
        // Arrange
        const mockOrder = {
          id: 1,
          status: ORDER_STATUS.PLACED,
          update: jest
            .fn()
            .mockRejectedValue(new Error("Database update failed"))
        };

        (Order.findByPk as jest.Mock).mockResolvedValue(mockOrder);

        // Act & Assert
        await expect(
          OrderService.updateOrderStatus(updateOrderStatusData)
        ).rejects.toThrow("Database update failed");
        expect(mockTransaction.rollback).toHaveBeenCalled();
        expect(mockTransaction.commit).not.toHaveBeenCalled();
      });
    });
  });

  describe("deleteOrder", () => {
    describe("success cases", () => {
      it("should delete order successfully when status is PLACED", async () => {
        // Arrange
        const orderId = 1;
        const mockOrder = {
          id: 1,
          status: ORDER_STATUS.PLACED,
          destroy: jest.fn().mockResolvedValue(undefined)
        };

        (Order.findByPk as jest.Mock).mockResolvedValue(mockOrder);
        (OrderItem.destroy as jest.Mock).mockResolvedValue(2);

        // Act
        const result = await OrderService.deleteOrder(orderId);

        // Assert
        expect(Order.findByPk).toHaveBeenCalledWith(orderId);
        expect(OrderItem.destroy).toHaveBeenCalledWith({
          where: { orderId: orderId },
          transaction: mockTransaction
        });
        expect(mockOrder.destroy).toHaveBeenCalledWith({
          transaction: mockTransaction
        });
        expect(mockTransaction.commit).toHaveBeenCalled();
        expect(result).toEqual({ message: "Order deleted successfully" });
      });

      it("should delete order items before deleting order", async () => {
        // Arrange
        const orderId = 1;
        const mockOrder = {
          id: 1,
          status: ORDER_STATUS.PLACED,
          destroy: jest.fn().mockResolvedValue(undefined)
        };

        (Order.findByPk as jest.Mock).mockResolvedValue(mockOrder);
        (OrderItem.destroy as jest.Mock).mockResolvedValue(3);

        // Act
        await OrderService.deleteOrder(orderId);

        // Assert
        const destroyOrderItems = OrderItem.destroy as jest.Mock;
        const destroyOrder = mockOrder.destroy;

        expect(destroyOrderItems.mock.invocationCallOrder[0]).toBeLessThan(
          (destroyOrder as jest.Mock).mock.invocationCallOrder[0]
        );
      });
    });

    describe("error cases", () => {
      it("should throw error when order not found", async () => {
        // Arrange
        (Order.findByPk as jest.Mock).mockResolvedValue(null);

        // Act & Assert
        await expect(OrderService.deleteOrder(999)).rejects.toThrow(
          "Order not found"
        );
        expect(mockTransaction.rollback).toHaveBeenCalled();
        expect(mockTransaction.commit).not.toHaveBeenCalled();
      });

      it("should throw error when trying to delete COMPLETED order", async () => {
        // Arrange
        const mockOrder = {
          id: 1,
          status: ORDER_STATUS.COMPLETED,
          destroy: jest.fn()
        };

        (Order.findByPk as jest.Mock).mockResolvedValue(mockOrder);

        // Act & Assert
        await expect(OrderService.deleteOrder(1)).rejects.toThrow(
          `Cannot delete order with status ${ORDER_STATUS.COMPLETED}`
        );
        expect(mockOrder.destroy).not.toHaveBeenCalled();
        expect(mockTransaction.rollback).toHaveBeenCalled();
      });

      it("should rollback transaction on order item deletion failure", async () => {
        // Arrange
        const mockOrder = {
          id: 1,
          status: ORDER_STATUS.PLACED,
          destroy: jest.fn()
        };

        (Order.findByPk as jest.Mock).mockResolvedValue(mockOrder);
        (OrderItem.destroy as jest.Mock).mockRejectedValue(
          new Error("Failed to delete order items")
        );

        // Act & Assert
        await expect(OrderService.deleteOrder(1)).rejects.toThrow(
          "Failed to delete order items"
        );
        expect(mockOrder.destroy).not.toHaveBeenCalled();
        expect(mockTransaction.rollback).toHaveBeenCalled();
      });

      it("should rollback transaction on order deletion failure", async () => {
        // Arrange
        const mockOrder = {
          id: 1,
          status: ORDER_STATUS.PLACED,
          destroy: jest
            .fn()
            .mockRejectedValue(new Error("Failed to delete order"))
        };

        (Order.findByPk as jest.Mock).mockResolvedValue(mockOrder);
        (OrderItem.destroy as jest.Mock).mockResolvedValue(2);

        // Act & Assert
        await expect(OrderService.deleteOrder(1)).rejects.toThrow(
          "Failed to delete order"
        );
        expect(mockTransaction.rollback).toHaveBeenCalled();
        expect(mockTransaction.commit).not.toHaveBeenCalled();
      });
    });
  });

  describe("getOrders", () => {
    describe("success cases", () => {
      it("should get orders created by creator", async () => {
        // Arrange
        const creatorId = 1;
        const creatorType = "store";
        const mockOrders = [
          {
            id: 1,
            creatorId: 1,
            creatorType: "store",
            status: ORDER_STATUS.PLACED
          },
          {
            id: 2,
            creatorId: 1,
            creatorType: "store",
            status: ORDER_STATUS.COMPLETED
          }
        ];

        (Order.findAll as jest.Mock).mockResolvedValue(mockOrders);

        // Act
        const result = await OrderService.getOrders(creatorId, creatorType);

        // Assert
        expect(Order.findAll).toHaveBeenCalledWith({
          where: {
            creatorId: 1,
            creatorType: "store"
          },
          order: [["created_at", "DESC"]]
        });
        expect(result).toEqual(mockOrders);
      });

      it("should get approval pending orders for approver", async () => {
        // Arrange
        const approverId = 2;
        const approverType = "distributor";
        const mockOrders = [
          {
            id: 1,
            approverId: 2,
            approverType: "distributor",
            status: ORDER_STATUS.PLACED
          }
        ];

        (Order.findAll as jest.Mock).mockResolvedValue(mockOrders);

        // Act
        const result = await OrderService.getOrders(
          approverId,
          approverType,
          undefined,
          undefined,
          true
        );

        // Assert
        expect(Order.findAll).toHaveBeenCalledWith({
          where: {
            approverId: 2,
            approverType: "distributor",
            status: ORDER_STATUS.PLACED
          },
          order: [["created_at", "DESC"]]
        });
        expect(result).toEqual(mockOrders);
      });

      it("should filter orders by entity when provided", async () => {
        // Arrange
        const creatorId = 1;
        const creatorType = "store";
        const entityId = 100;
        const entityType = "store";

        (Order.findAll as jest.Mock).mockResolvedValue([]);

        // Act
        await OrderService.getOrders(
          creatorId,
          creatorType,
          entityId,
          entityType
        );

        // Assert
        expect(Order.findAll).toHaveBeenCalledWith({
          where: {
            creatorId: 1,
            creatorType: "store",
            entityId: 100,
            entityType: "store"
          },
          order: [["created_at", "DESC"]]
        });
      });

      it("should return empty array when no orders found", async () => {
        // Arrange
        (Order.findAll as jest.Mock).mockResolvedValue([]);

        // Act
        const result = await OrderService.getOrders(1, "store");

        // Assert
        expect(result).toEqual([]);
        expect(result).toHaveLength(0);
      });
    });

    describe("error cases", () => {
      it("should handle database errors", async () => {
        // Arrange
        (Order.findAll as jest.Mock).mockRejectedValue(
          new Error("Database connection failed")
        );

        // Act & Assert
        await expect(OrderService.getOrders(1, "store")).rejects.toThrow(
          "Database connection failed"
        );
      });
    });
  });

  describe("getOrderDetails", () => {
    describe("success cases", () => {
      it("should get order details for creator", async () => {
        // Arrange
        const orderId = 1;
        const creatorId = 100;
        const creatorType = "store";
        const distributorId = 200;

        const mockOrder = {
          id: 1,
          creatorId: 100,
          creatorType: "store",
          totalAmount: 150.0,
          OrderItems: [
            {
              id: 1,
              productId: 200,
              quantity: 5,
              price: 10.0,
              Product: {
                id: 200,
                name: "Product A",
                brand: "Brand A",
                size: "10oz"
              },
              Manufacturer: {
                name: "Manufacturer A"
              }
            }
          ]
        };

        (Order.findOne as jest.Mock).mockResolvedValue(mockOrder);

        // Act
        const result = await OrderService.getOrderDetails(
          orderId,
          creatorId,
          creatorType,
          distributorId
        );

        // Assert
        expect(Order.findOne).toHaveBeenCalled();
        expect(result).toEqual(mockOrder);
      });

      it("should get order details for approver", async () => {
        // Arrange
        const orderId = 1;
        const approverId = 200;
        const approverType = "distributor";
        const distributorId = 200;

        const mockOrder = {
          id: 1,
          approverId: 200,
          approverType: "distributor"
        };

        (Order.findOne as jest.Mock).mockResolvedValue(mockOrder);

        // Act
        const result = await OrderService.getOrderDetails(
          orderId,
          approverId,
          approverType,
          distributorId
        );

        // Assert
        expect(Order.findOne).toHaveBeenCalled();
        expect(result).toEqual(mockOrder);
      });

      it("should return null when order not found", async () => {
        // Arrange
        (Order.findOne as jest.Mock).mockResolvedValue(null);

        // Act
        const result = await OrderService.getOrderDetails(
          999,
          100,
          "store",
          200
        );

        // Assert
        expect(result).toBeNull();
      });

      it("should include product code mapping when distributor ID provided", async () => {
        // Arrange
        const orderId = 1;
        const creatorId = 100;
        const creatorType = "store";
        const distributorId = 200;

        (Order.findOne as jest.Mock).mockResolvedValue({});

        // Act
        await OrderService.getOrderDetails(
          orderId,
          creatorId,
          creatorType,
          distributorId
        );

        // Assert
        const callArgs = (Order.findOne as jest.Mock).mock.calls[0][0];
        expect(callArgs.include[0].include[0].attributes).toEqual(
          expect.arrayContaining([
            "id",
            "name",
            "brand",
            "size",
            expect.arrayContaining([expect.anything(), "internal_code"])
          ])
        );
      });
    });

    describe("error cases", () => {
      it("should handle database errors", async () => {
        // Arrange
        (Order.findOne as jest.Mock).mockRejectedValue(
          new Error("Database error")
        );

        // Act & Assert
        await expect(
          OrderService.getOrderDetails(1, 100, "store", 200)
        ).rejects.toThrow("Database error");
      });
    });
  });
});
