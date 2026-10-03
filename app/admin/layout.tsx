import type {ReactNode} from "react";
import {commandAccess} from "../../lib/authz";

export default async function AdminLayout({children}:{children:ReactNode}){
 await commandAccess();
 return children;
}
