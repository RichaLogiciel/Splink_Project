const THORN = "\u00FE";

// Test SOH record
const customerNumber = "261250";
const orderDate = "260107";
const deliveryDate = "260121";
const thorn2 = THORN.repeat(2);
const thorn11 = THORN.repeat(11);
const thorn5 = THORN.repeat(5);
const thorn49 = THORN.repeat(49);
const sohLine = `SOH${THORN}${customerNumber}${THORN}${orderDate}${thorn2}NCD${thorn11}REG${thorn5}${deliveryDate}${thorn2}NCD${thorn49}`;
console.log("SOH line length:", sohLine.length);
console.log("Expected: 100");
console.log("SOH line:", sohLine);

// Test SOD record with quantity=1
const quantity1 = "1";
const itemNumber1 = "400625";
const itemNumberWithEnd1 = `${itemNumber1}|01`;
const thorn3 = THORN.repeat(3);
const thorn51 = THORN.repeat(51);
const sodLine1 = `SOD${THORN}${deliveryDate}${THORN}${quantity1}${thorn3}${itemNumberWithEnd1}${thorn51}`;
console.log("\nSOD line length (qty=1):", sodLine1.length);
console.log("Expected: 100");
console.log("SOD line:", sodLine1);

// Test SOD record with quantity=100
const quantity100 = "100";
const itemNumber100 = "400625";
const itemNumberWithEnd100 = `${itemNumber100}|01`;
const sodLine100 = `SOD${THORN}${deliveryDate}${THORN}${quantity100}${thorn3}${itemNumberWithEnd100}${thorn51}`;
console.log("\nSOD line length (qty=100):", sodLine100.length);
console.log("Expected: 100");
console.log("SOD line:", sodLine100);
