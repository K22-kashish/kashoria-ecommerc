import './globals.css';import Header from '@/components/Header';import Footer from '@/components/Footer';import type {Metadata} from 'next';
export const metadata:Metadata={title:'KASHORIA | Handmade with Love',description:'Handmade crochet gifts, charms, keychains and accessories.'};
export default function Layout({children}:{children:React.ReactNode}){return <><Header/>{children}<Footer/></>}
