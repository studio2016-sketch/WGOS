export type BrandId="global"|"studio2016"|"jermaine-williams"|"charmin-greene"|"charmin-jermaine"|"cg-success"|"sound-legacy"|"dionnes-boutique";
export interface Brand{id:BrandId;name:string;publicDomain:string;legalType:string;owned:boolean}
export interface Person{id:string;firstName:string;lastName:string;email?:string;phone?:string;brandIds:BrandId[];organizationIds:string[];createdAt:string}
export interface Organization{id:string;name:string;website?:string;brandIds:BrandId[];createdAt:string}
export interface Opportunity{id:string;brandId:BrandId;personId?:string;organizationId?:string;title:string;stage:"lead"|"discovery"|"qualified"|"proposal"|"negotiation"|"won"|"lost";valueCents:number;currency:"USD";ownerId:string;createdAt:string}
export interface Proposal{id:string;opportunityId:string;brandId:BrandId;publicPath:string;status:"draft"|"sent"|"viewed"|"accepted"|"declined";totalCents:number}
export interface Project{id:string;brandId:BrandId;opportunityId?:string;name:string;status:"planning"|"active"|"complete"|"cancelled";startAt?:string;endAt?:string}
export interface Membership{id:string;userId:string;brandId:BrandId;role:"owner"|"admin"|"manager"|"member"|"viewer"}