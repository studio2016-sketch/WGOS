export const CONTRACT_PURSUIT_URL = 'https://studio2016-contract-pursuit.elven-harp-2345.chatgpt.site';
export const CONTRACT_PURSUIT_PATH = '/admin/pursuits';
type Brand = {id:string;name:string};
export function studioPursuitBrand(brands:Brand[],selectedBrand?:string){
 return brands.find(b=>String(b.name).toLowerCase().replace(/[^a-z0-9]/g,'')==='studio2016'&&(!selectedBrand||b.id===selectedBrand));
}
export function contractPursuitHref(brandId:string){return CONTRACT_PURSUIT_PATH+'?brand='+encodeURIComponent(brandId)}
