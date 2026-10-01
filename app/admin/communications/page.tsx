import AdminNav from "../AdminNav";
import CommunicationWorkspace from "../CommunicationWorkspace";
import {relationshipReferenceData} from "../../../lib/relationships";
import {listCommunicationThreads,listThreadMessages} from "../../../lib/communications";

export default async function CommunicationsPage({searchParams}:{searchParams:Promise<{thread?:string;brand?:string}>}){
 const query=await searchParams;let refs:any={brands:[],organizations:[]},threads:any[]=[],messages:any[]=[];
 try{[refs,threads]=await Promise.all([relationshipReferenceData(),listCommunicationThreads(query.brand)]);const selected=query.thread||threads[0]?.id;if(selected)messages=await listThreadMessages(String(selected));}catch{}
 return <main className="admin"><AdminNav active="communications" brands={refs.brands} brand={query.brand}/><header className="adminHead"><div><p className="eyebrow">WGOS · CLIENT INTELLIGENCE</p><h1>Communications</h1><p>Every promise, conversation and client decision in the same operating record as the opportunity and delivery.</p></div></header><CommunicationWorkspace threads={threads} messages={messages} brands={refs.brands} organizations={refs.organizations} selectedId={query.thread}/></main>;
}
