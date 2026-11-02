export type Branch={label:string;description:string;path:string};
const common=[
 {label:"Clients",description:"Contacts and relationships",path:"/admin/branch/clients"},
 {label:"Bookings",description:"Inquiries and proposals",path:"/admin/branch/bookings"},
 {label:"Projects",description:"Work and delivery",path:"/admin/operations"},
 {label:"Messages",description:"Conversations",path:"/admin/communications"},
 {label:"Finances",description:"Costs and payments",path:"/admin/records/finances"}
];
export function businessBranches(name:string):Branch[]{
 const n=name.toLowerCase();
 if(n.includes("dionne"))return [
 {label:"Inventory",description:"Catalog and stock",path:"/admin/boutique"},
 {label:"Orders",description:"Purchases and fulfillment",path:"/admin/boutique/orders"},
 {label:"Sales",description:"Revenue and transactions",path:"/admin/boutique/sales"},
 {label:"Customers",description:"Service and relationships",path:"/admin/boutique/customers"},
 {label:"Finances",description:"Costs and profit",path:"/admin/boutique/finances"}];
 if(n.includes("studio2016"))return [
 common[1],{label:"Productions",description:"Shows and delivery",path:"/admin/operations"},
 {label:"Personnel",description:"Crew and assignments",path:"/admin/people"},
 {label:"Equipment",description:"Assets and readiness",path:"/admin/equipment"},common[4]];
 if(n.includes("bass one"))return [
 {label:"Commissions",description:"Instrument requests",path:"/admin/branch/bookings"},
 {label:"Builds",description:"Instrument production",path:"/admin/operations"},
 {label:"Equipment",description:"Assets and stock",path:"/admin/equipment"},common[0],common[4]];
 if(n.includes("sound legacy"))return [
 {label:"Enrollment",description:"Students and inquiries",path:"/admin/branch/clients"},
 {label:"Programs",description:"Classes and curriculum",path:"/admin/records/projects"},
 {label:"Faculty",description:"Staff and access",path:"/admin/people"},
 {label:"Schedule",description:"Dates and classes",path:"/admin/calendar"},common[4]];
 if(n.includes("tradeos"))return [
 {label:"Research",description:"Evidence and hypotheses",path:"/admin/records/projects"},
 {label:"Certification",description:"Validation and controls",path:"/admin/branch/approvals"},
 common[2],common[3],common[4]];
 if(n.includes("williams strategic"))return [
 {label:"Ventures",description:"Development opportunities",path:"/admin/branch/bookings"},
 common[0],common[2],{label:"Agreements",description:"Terms and signatures",path:"/admin/records/contracts"},common[4]];
 return common;
}
