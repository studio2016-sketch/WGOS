import {notFound,redirect} from "next/navigation";
import {commandAccess} from "../../../../lib/authz";
import {getProposalReviewData} from "../../../../lib/documents";
import ProposalReviewWorkspace from "./ProposalReviewWorkspace";

export default async function ProposalReviewPage({params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 const access=await commandAccess();
 const data:any=await getProposalReviewData(id);
 if(!data)notFound();
 if(!access.isGlobal&&!(access.brandIds||[]).includes(String(data.proposal.brand_id)))redirect("/admin");
 return <ProposalReviewWorkspace data={data}/>;
}
