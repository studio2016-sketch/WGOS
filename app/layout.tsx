import "./globals.css";
import "./mobile-calendar-fix.css";
import "./admin-light.css";
export const metadata={title:"WGOS",description:"Williams Global Operating System",robots:{index:false,follow:false}};
export const viewport={themeColor:"#f6f7f2"};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
