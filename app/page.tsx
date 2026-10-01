import {redirect} from "next/navigation";
import {currentIdentity} from "../lib/authz";

export default async function Home(){
 const identity:any=await currentIdentity();
 if(!identity)redirect("/login");
 redirect(["OWNER","ADMIN"].includes(String(identity.role))?"/admin":"/work");
}
