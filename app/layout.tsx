import "./globals.css";
import "./mobile-calendar-fix.css";
export const metadata={title:"WGOS",description:"Williams Global Operating System"};
export const viewport={themeColor:"#080a0b"};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
