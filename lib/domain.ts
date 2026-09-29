export type BrandId=
 |"studio2016"
 |"jermaine"
 |"charmin"
 |"charminJermaine"
 |"bassOne"
 |"cgSuccess"
 |"soundLegacy"
 |"dionnesBoutique";

export type BrandContextId="global"|BrandId;
export type BrandRelationshipType="CONTROLLED"|"EXTERNAL_PARTNER"|"CLIENT"|"OTHER";

export interface Brand{
 id:BrandId;
 name:string;
 publicDomain?:string;
 legalType?:string;
 relationshipType:BrandRelationshipType;
 ownershipClaimed:boolean;
}

export interface Person{
 id:string;
 firstName:string;
 lastName:string;
 email?:string;
 phone?:string;
 brandIds:BrandId[];
 organizationIds:string[];
 createdAt:string;
}

export interface Organization{
 id:string;
 name:string;
 website?:string;
 brandIds:BrandId[];
 createdAt:string;
}

export interface Opportunity{
 id:string;
 brandId:BrandId;
 personId?:string;
 organizationId?:string;
 title:string;
 stage:"NEW"|"QUALIFYING"|"DISCOVERY"|"PROPOSAL"|"NEGOTIATION"|"WON"|"LOST";
 estimatedValue?:number;
 currency:"USD";
 ownerId?:string;
 createdAt:string;
}

export interface Project{
 id:string;
 brandId:BrandId;
 opportunityId?:string;
 proposalId?:string;
 title:string;
 status:"PLANNING"|"ACTIVE"|"BLOCKED"|"COMPLETE"|"CANCELLED";
 startAt?:string;
 endAt?:string;
 ownerId?:string;
}

export interface Membership{
 id:string;
 userId:string;
 brandId:BrandId;
 role:"OWNER"|"ADMIN"|"TEAM";
}

export const canonicalBrands:Record<BrandId,Brand>={
 studio2016:{id:"studio2016",name:"Studio2016",publicDomain:"studio2016.com",relationshipType:"CONTROLLED",ownershipClaimed:true},
 jermaine:{id:"jermaine",name:"Jermaine Williams",publicDomain:"jermainewilliams.com",relationshipType:"CONTROLLED",ownershipClaimed:true},
 charmin:{id:"charmin",name:"Charmin Greene",publicDomain:"charmingreene.com",relationshipType:"CONTROLLED",ownershipClaimed:true},
 charminJermaine:{id:"charminJermaine",name:"Charmin & Jermaine",publicDomain:"charminjermaine.com",relationshipType:"CONTROLLED",ownershipClaimed:true},
 cgSuccess:{id:"cgSuccess",name:"CG Success",publicDomain:"cgsuccessenterprise.com",relationshipType:"CONTROLLED",ownershipClaimed:true},
 soundLegacy:{id:"soundLegacy",name:"Sound Legacy Institute",publicDomain:"soundlegacyinstitute.com",relationshipType:"CONTROLLED",ownershipClaimed:true},
 dionnesBoutique:{id:"dionnesBoutique",name:"Dionne’s Boutique",relationshipType:"CONTROLLED",ownershipClaimed:true},
 bassOne:{id:"bassOne",name:"Bass One Basses",relationshipType:"EXTERNAL_PARTNER",ownershipClaimed:false}
};
