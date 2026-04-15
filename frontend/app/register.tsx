import { removeToken } from "../src/utils/session";
import { useRouter } from "expo-router";

const router = useRouter();

const handleLogout = async () => {
  await removeToken();
  router.replace("/login");
};