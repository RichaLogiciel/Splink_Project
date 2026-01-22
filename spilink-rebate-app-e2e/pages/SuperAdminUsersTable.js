import { ENTITY_TYPE } from '../utils/constant';
import BasePage from './BasePage';
import LoginPage from './LoginPage';

const superAdminEmail =
  process.env.SUPER_ADMIN_EMAIL || 'superadmin@example.com';
const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD || 'password';

class SuperAdminUsersTable extends BasePage {
  constructor(page) {
    super(page);
    this.searchInput = '.search-container input';
    this.firstRowActionIcon = 'tbody tr:first-child [id="action-icon"]';
    this.impersonateUserBtn = '#impersonate-user';
    this.confirmImpersonateBtn = '#headlessui-portal-root button.bg-red-600';
  }

  async searchUser(name) {
    await this.page.fill(this.searchInput, name);
  }

  async waitForTableUpdate(email) {
    await this.page.waitForSelector(`text=${email}`);
  }

  async openFirstRowActions() {
    await this.page.click(this.firstRowActionIcon);
  }

  async clickImpersonate() {
    await this.page.click(this.impersonateUserBtn);
  }

  async confirmImpersonation() {
    await this.page.click(this.confirmImpersonateBtn);
  }

  async changeRoleFromDropdown(type) {
    const selector = '#user-role-dropdown button';
    const selectElement = this.page.locator(selector);
    if (await selectElement.isVisible()) {
      await selectElement.click();
      switch (type) {
        case ENTITY_TYPE.MANUFACTURER:
          await this.page.click('div.cursor-pointer:has-text("Manufacturer")');
          break;
        case ENTITY_TYPE.DISTRIBUTOR_SALES_REP:
          await this.page.click(
            'div.cursor-pointer:has-text("Distributor Sales Rep")'
          );
          break;
        case ENTITY_TYPE.DISTRIBUTOR_ADMIN:
          await this.page.click(
            'div.cursor-pointer:has-text("Distributor Admin")'
          );
          break;
        case ENTITY_TYPE.SALES_REP_MANAGER:
          await this.page.click(
            'div.cursor-pointer:has-text("Sales Rep Manager")'
          );
          break;
      }
    } else {
      console.error('No dropdown found');
    }
  }

  /**
   * Impersonate a user by type and name using provided user maps.
   * @param {'MANUFACTURER'|'DISTRIBUTOR_SALES_REP'|'DISTRIBUTOR_ADMIN'|'SALES_REP_MANAGER'|'string'} type
   * @param {string} name
   * @param {{ manufacturerMap: Map, distributorMap: Map, salesRepMap: Map, salesRepManagerMap: Map }} userMaps
   */
  async impersonateUser(type, name, userMaps) {
    const loginPage = new LoginPage(this.page);
    await loginPage.navigateToLogin();
    await loginPage.login(superAdminEmail, superAdminPassword);
    await this.page.waitForLoadState('networkidle', {
      timeout: 7000, // Wait for network to be idle
    });

    let map;
    switch (type) {
      case ENTITY_TYPE.MANUFACTURER:
        map = userMaps.manufacturerMap;
        break;
      case ENTITY_TYPE.DISTRIBUTOR_SALES_REP:
        map = userMaps.salesRepMap;
        break;
      case ENTITY_TYPE.SALES_REP_MANAGER:
        map = userMaps.salesRepManagerMap;
        break;
      default:
        map = userMaps.distributorMap;
        break;
    }
    if (!map) throw new Error(`${type} Map is not initialized`);
    const user = map.get(name);
    if (!user) throw new Error(`User "${name}" not found in ${type}Map`);

    await this.changeRoleFromDropdown(type);
    await this.page.waitForLoadState('networkidle', {
      timeout: 5000, // Wait for network to be idle
    });
    await this.page.waitForTimeout(1000); // Wait for dropdown to update
    await this.searchUser(
      user.email.includes('+') ? user.name : user.email // Use email for impersonation
      // type === ENTITY_TYPE.DISTRIBUTOR_SALES_REP ? user.email : user.name
    );
    await this.page.waitForLoadState('networkidle', {
      timeout: 5000, // Wait for network to be idle
    });
    await this.page.waitForTimeout(1500); // Wait for dropdown to update
    await this.waitForTableUpdate(user.email);
    await this.openFirstRowActions();
    await this.clickImpersonate();
    await this.confirmImpersonation();
    await this.page.waitForLoadState('networkidle');
  }
}

export default SuperAdminUsersTable;
