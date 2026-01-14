"use strict";

const { DataTypes } = require("sequelize");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    console.log("🔍 Starting compliance_date format change process...");

    // Step 1: Find materialized views that depend on compliance_date
    console.log(
      "📋 Step 1: Finding materialized views that depend on compliance_date..."
    );

    const findMVsQuery = `
      SELECT 
        schemaname,
        matviewname,
        definition
      FROM pg_matviews 
      WHERE definition ILIKE '%compliance_date%'
      ORDER BY schemaname, matviewname;
    `;

    const mvResults = await queryInterface.sequelize.query(findMVsQuery, {
      type: queryInterface.sequelize.QueryTypes.SELECT
    });

    let materializedViews = [];

    if (mvResults && mvResults.length > 0) {
      console.log(
        `✅ Found ${mvResults.length} materialized view(s) that depend on compliance_date:`
      );

      mvResults.forEach((mv, index) => {
        console.log(`   ${index + 1}. ${mv.schemaname}.${mv.matviewname}`);
        materializedViews.push(mv);
      });

      // Step 2: Drop the materialized views
      console.log("🗑️  Step 2: Dropping materialized views...");

      for (const mv of materializedViews) {
        const dropQuery = `DROP MATERIALIZED VIEW IF EXISTS ${mv.schemaname}.${mv.matviewname} CASCADE;`;
        console.log(`   Dropping ${mv.schemaname}.${mv.matviewname}...`);
        await queryInterface.sequelize.query(dropQuery);
        console.log(`   ✅ Dropped ${mv.schemaname}.${mv.matviewname}`);
      }
    } else {
      console.log(
        "ℹ️  No materialized views found that depend on compliance_date"
      );
    }

    // Step 3: Alter the compliance_date column
    console.log(
      "🔄 Step 3: Changing compliance_date column from DATE to DATEONLY..."
    );

    await queryInterface.changeColumn(
      "program_compliances",
      "compliance_date",
      {
        type: DataTypes.DATEONLY,
        allowNull: false,
        field: "compliance_date"
      }
    );

    console.log("✅ compliance_date column changed to DATEONLY format");

    // Step 4: Recreate the materialized views
    if (materializedViews.length > 0) {
      console.log("🔄 Step 4: Recreating materialized views...");

      for (const mv of materializedViews) {
        const createQuery = `
          CREATE MATERIALIZED VIEW ${mv.schemaname}.${mv.matviewname} AS
          ${mv.definition}
        `;

        console.log(`   Recreating ${mv.schemaname}.${mv.matviewname}...`);
        await queryInterface.sequelize.query(createQuery);
        console.log(`   ✅ Recreated ${mv.schemaname}.${mv.matviewname}`);
      }
    }

    console.log("🎉 Compliance date format change completed successfully!");
    console.log("📝 Summary:");
    console.log("   - compliance_date column changed from DATE to DATEONLY");
    if (materializedViews.length > 0) {
      console.log(
        `   - ${materializedViews.length} materialized view(s) recreated`
      );
    }
  },

  async down(queryInterface) {
    console.log("🔄 Starting compliance_date format rollback process...");

    // Step 1: Find materialized views that depend on compliance_date
    console.log(
      "📋 Step 1: Finding materialized views that depend on compliance_date..."
    );

    const findMVsQuery = `
      SELECT 
        schemaname,
        matviewname,
        definition
      FROM pg_matviews 
      WHERE definition ILIKE '%compliance_date%'
      ORDER BY schemaname, matviewname;
    `;

    const mvResults = await queryInterface.sequelize.query(findMVsQuery, {
      type: queryInterface.sequelize.QueryTypes.SELECT
    });

    let materializedViews = [];

    if (mvResults && mvResults.length > 0) {
      console.log(
        `✅ Found ${mvResults.length} materialized view(s) that depend on compliance_date:`
      );

      mvResults.forEach((mv, index) => {
        console.log(`   ${index + 1}. ${mv.schemaname}.${mv.matviewname}`);
        materializedViews.push(mv);
      });

      // Step 2: Drop the materialized views
      console.log("🗑️  Step 2: Dropping materialized views...");

      for (const mv of materializedViews) {
        const dropQuery = `DROP MATERIALIZED VIEW IF EXISTS ${mv.schemaname}.${mv.matviewname} CASCADE;`;
        console.log(`   Dropping ${mv.schemaname}.${mv.matviewname}...`);
        await queryInterface.sequelize.query(dropQuery);
        console.log(`   ✅ Dropped ${mv.schemaname}.${mv.matviewname}`);
      }
    } else {
      console.log(
        "ℹ️  No materialized views found that depend on compliance_date"
      );
    }

    // Step 3: Alter the compliance_date column back to DATE
    console.log(
      "🔄 Step 3: Changing compliance_date column back from DATEONLY to DATE..."
    );

    await queryInterface.changeColumn(
      "program_compliances",
      "compliance_date",
      {
        type: DataTypes.DATE,
        allowNull: false,
        field: "compliance_date"
      }
    );

    console.log("✅ compliance_date column changed back to DATE format");

    // Step 4: Recreate the materialized views
    if (materializedViews.length > 0) {
      console.log("🔄 Step 4: Recreating materialized views...");

      for (const mv of materializedViews) {
        const createQuery = `
          CREATE MATERIALIZED VIEW ${mv.schemaname}.${mv.matviewname} AS
          ${mv.definition}
        `;

        console.log(`   Recreating ${mv.schemaname}.${mv.matviewname}...`);
        await queryInterface.sequelize.query(createQuery);
        console.log(`   ✅ Recreated ${mv.schemaname}.${mv.matviewname}`);
      }
    }

    console.log("🎉 Compliance date format rollback completed successfully!");
    console.log("📝 Summary:");
    console.log(
      "   - compliance_date column changed back from DATEONLY to DATE"
    );
    if (materializedViews.length > 0) {
      console.log(
        `   - ${materializedViews.length} materialized view(s) recreated`
      );
    }
  }
};
