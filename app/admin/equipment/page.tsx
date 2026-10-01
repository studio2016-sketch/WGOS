import AdminNav from "../AdminNav";
import EquipmentWorkspace from "../EquipmentWorkspace";
import {relationshipReferenceData} from "../../../lib/relationships";
import {listEquipmentAssets} from "../../../lib/resources";

export default async function EquipmentPage({searchParams}:{searchParams:Promise<{brand?:string}>}){
 const query=await searchParams;let refs:any={brands:[]},assets:any[]=[];try{[refs,assets]=await Promise.all([relationshipReferenceData(),listEquipmentAssets(query.brand)]);}catch{}
 return <main className="admin"><AdminNav active="equipment" brands={refs.brands} brand={query.brand}/><header className="adminHead"><div><p className="eyebrow">WGOS · PRODUCTION ASSETS</p><h1>Resource Readiness</h1><p>Equipment availability is a commercial control: protect dates and scope before commitments are made.</p></div></header><EquipmentWorkspace assets={assets} brands={refs.brands}/></main>;
}
