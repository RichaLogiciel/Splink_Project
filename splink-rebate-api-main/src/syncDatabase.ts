/* eslint-disable no-console */
import { LineItem, Manufacturer, Product } from "./models/associations";

export async function syncDatabase() {
  try {
    // Sync each model with the database
    await LineItem.sync();
    await Product.sync();
    await Manufacturer.sync();

    console.log("Database synced successfully");
  } catch (error) {
    console.error("Failed to sync database:", error);
  }
}
