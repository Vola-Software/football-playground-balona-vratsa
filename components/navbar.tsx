import { auth } from "@/auth";
import NavbarClient from "./navbar-client";

export default async function Navbar() {
  const session = await auth();
  const user = session?.user;

  return (
    <NavbarClient
      user={
        user
          ? { name: user.name, email: user.email, role: user.role }
          : null
      }
    />
  );
}
