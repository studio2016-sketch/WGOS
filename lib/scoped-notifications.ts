import 'server-only';
import {db} from './db';
export async function scopedPendingNotifications(authUserId:string,limit=50){
 const sql=db();
 return sql`SELECT n.id,n.brand_id,b.name AS brand_name,n.event_type,n.status,n.payload,n.created_at FROM wgos.notification_events n JOIN wgos.brands b ON b.id=n.brand_id JOIN wgos.brand_memberships m ON m.brand_id=n.brand_id AND m.auth_user_id=${authUserId} AND m.active=true WHERE n.status='PENDING' AND n.channel='IN_APP' ORDER BY n.created_at DESC LIMIT ${Math.max(1,Math.min(limit,100))}`;
}
