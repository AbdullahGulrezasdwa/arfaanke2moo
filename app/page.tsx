import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Video, MessageCircle, Users, Shield } from 'lucide-react'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    redirect('/chat')
  }

  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex h-16 items-center justify-between border-b border-border/50 px-6">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <Video className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold">ProMeet</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/auth/login">
            <Button variant="ghost">Sign in</Button>
          </Link>
          <Link href="/auth/sign-up">
            <Button>Get Started</Button>
          </Link>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-6">
        <div className="flex max-w-3xl flex-col items-center gap-8 text-center">
          <div className="flex flex-col gap-4">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl text-balance">
              Connect with anyone,{' '}
              <span className="text-primary">anywhere</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl text-pretty">
              ProMeet brings video calling and instant messaging together in one 
              seamless experience. Stay connected with friends in real-time.
            </p>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row">
            <Link href="/auth/sign-up">
              <Button size="lg" className="gap-2">
                <Users className="h-5 w-5" />
                Create Free Account
              </Button>
            </Link>
            <Link href="/auth/login">
              <Button size="lg" variant="outline" className="gap-2">
                Sign in
              </Button>
            </Link>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-3 w-full max-w-2xl">
            <div className="flex flex-col items-center gap-2 rounded-lg border border-border/50 bg-card p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Video className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold">Video Calls</h3>
              <p className="text-sm text-muted-foreground text-center">
                Crystal clear video calls with your friends
              </p>
            </div>
            <div className="flex flex-col items-center gap-2 rounded-lg border border-border/50 bg-card p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <MessageCircle className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold">Instant Chat</h3>
              <p className="text-sm text-muted-foreground text-center">
                Real-time messaging that syncs everywhere
              </p>
            </div>
            <div className="flex flex-col items-center gap-2 rounded-lg border border-border/50 bg-card p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold">Private & Secure</h3>
              <p className="text-sm text-muted-foreground text-center">
                Your conversations stay between you
              </p>
            </div>
          </div>
        </div>
      </main>

      <footer className="flex h-16 items-center justify-center border-t border-border/50 px-6">
        <p className="text-sm text-muted-foreground">
          ProMeet - Video chat made simple
        </p>
      </footer>
    </div>
  )
}
