import "./globals.css";
export const metadata={title:"WGOS",description:"Williams Global Operating System",themeColor:"#080a0b"};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}