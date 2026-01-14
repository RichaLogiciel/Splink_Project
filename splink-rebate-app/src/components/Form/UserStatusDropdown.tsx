import CustomDropdown from "@/components/Form/CustomDropdown";
import userStatuses from "@/mocks/users/users-dropdown.json";

const UserStatusDropdown = () => {
  return (
    <CustomDropdown
      options={userStatuses}
      queryParamKey="status"
      labelPrefix="Status:"
    />
  );
};

export default UserStatusDropdown;
