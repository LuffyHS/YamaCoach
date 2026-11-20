import Link from "next/link";
import { LoginForm } from "@/components/login-form";
import { ThemeToggle } from "@/components/theme-toggle";
export default async function LoginPage({searchParams}:{searchParams:Promise<{mode?:string}>}){const params=await searchParams;return <main className="site login-page"><nav className="topnav"><Link href="/" className="brand login-brand">◉ YAMA<span className="brand-muted">coach</span></Link><div className="login-top-actions"><ThemeToggle compact/><Link href="/" className="nav-link">← Voltar</Link></div></nav><LoginForm initialSignup={params.mode==="signup"}/></main>}


