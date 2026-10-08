import type { Metadata } from 'next';
import './globals.css';
const origin=process.env.NEXT_PUBLIC_SITE_URL||'https://sheetmedic-goodwin-labs.grandmink.chatgpt.site';
export const metadata:Metadata={metadataBase:new URL(origin),title:'SheetMedic — Clean CSV & Excel files privately',description:'Diagnose messy spreadsheets, remove duplicate CSV rows and preview safe repairs. CSV and XLSX processing stays in your browser. Free, no signup.',alternates:{canonical:'/'},openGraph:{title:'SheetMedic · A clean sheet starts here.',description:'Diagnose, clean and repair messy spreadsheets in seconds.',type:'website',url:'/'},robots:{index:true,follow:true}};
export default function RootLayout({children}:{children:React.ReactNode}) {
  return <html lang="en"><body>{children}<script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify({'@context':'https://schema.org','@type':'SoftwareApplication',name:'SheetMedic',applicationCategory:'UtilitiesApplication',operatingSystem:'Web browser',offers:{'@type':'Offer',price:'0',priceCurrency:'USD'}})}}/></body></html>;
}
