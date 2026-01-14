import { APP_ROUTES } from "@/configs/routes";
import { redirect } from "next/navigation";

export default function Page() {
  redirect(APP_ROUTES.login);
}
