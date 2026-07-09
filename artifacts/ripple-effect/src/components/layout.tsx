import React, { ReactNode, useState, useEffect } from 'react';
import { useTranslation } from '@/lib/i18n';
import { useClerk, useUser, Show } from '@clerk/react';
import { Link, useLocation } from 'wouter';
import { LogOut, Menu, X, Globe, Library } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function Layout({ children }: { children: ReactNode }) {
  const { t, language, setLanguage } = useTranslation();
  const { signOut } = useClerk();
  const { user } = useUser();
  const [, setLocation] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile menu on route change
  const [loc] = useLocation();
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [loc]);

  return (
    <div className="min-h-screen flex flex-col bg-background font-sans">
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center text-primary-foreground font-serif font-bold text-lg group-hover:scale-105 transition-transform">
                R
              </div>
              <span className="font-semibold text-lg tracking-tight hidden sm:inline-block">
                The Ripple Effect
              </span>
            </Link>
            
            <nav className="hidden md:flex items-center gap-1 text-sm font-medium text-muted-foreground ml-4">
              <Show when="signed-in">
                <Link href="/products" className="px-3 py-2 rounded-md hover:text-foreground hover:bg-accent transition-colors">
                  {t('nav.products')}
                </Link>
              </Show>
            </nav>
          </div>

          <div className="hidden md:flex items-center gap-4">
            <div className="flex items-center gap-1 p-1 bg-muted rounded-full">
              <button
                onClick={() => setLanguage('en')}
                className={`text-xs font-semibold px-2 py-1 rounded-full transition-all ${
                  language === 'en' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                EN
              </button>
              <button
                onClick={() => setLanguage('it')}
                className={`text-xs font-semibold px-2 py-1 rounded-full transition-all ${
                  language === 'it' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                IT
              </button>
            </div>

            <div className="w-px h-6 bg-border mx-1" />

            <Show when="signed-in">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium">{user?.firstName || user?.emailAddresses[0]?.emailAddress}</span>
                <Button variant="outline" size="sm" onClick={() => signOut({ redirectUrl: '/' })}>
                  {t('nav.signout')}
                </Button>
              </div>
            </Show>
            
            <Show when="signed-out">
              <div className="flex items-center gap-2">
                <Link href="/sign-in">
                  <Button variant="ghost" size="sm" className="font-medium">
                    {t('nav.signin')}
                  </Button>
                </Link>
                <Link href="/sign-up">
                  <Button size="sm" className="font-medium">
                    {t('nav.signup')}
                  </Button>
                </Link>
              </div>
            </Show>
          </div>

          <button 
            className="md:hidden p-2 text-foreground"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </header>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 top-16 z-40 bg-background border-b border-border p-4 flex flex-col gap-4 animate-in slide-in-from-top-2">
          <Show when="signed-in">
            <Link href="/products" className="flex items-center gap-2 px-4 py-3 rounded-md hover:bg-accent text-lg font-medium">
              <Library size={20} />
              {t('nav.products')}
            </Link>
          </Show>

          <div className="mt-4 px-4">
            <div className="text-sm text-muted-foreground font-medium mb-3 flex items-center gap-2">
              <Globe size={16} /> Language / Lingua
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={language === 'en' ? 'default' : 'outline'}
                onClick={() => setLanguage('en')}
              >
                English
              </Button>
              <Button
                variant={language === 'it' ? 'default' : 'outline'}
                onClick={() => setLanguage('it')}
              >
                Italiano
              </Button>
            </div>
          </div>

          <div className="mt-auto px-4 pb-6">
            <Show when="signed-in">
              <div className="flex flex-col gap-3">
                <div className="text-sm font-medium text-muted-foreground px-1">
                  Signed in as {user?.emailAddresses[0]?.emailAddress}
                </div>
                <Button variant="outline" className="w-full justify-start gap-2" onClick={() => signOut({ redirectUrl: '/' })}>
                  <LogOut size={18} />
                  {t('nav.signout')}
                </Button>
              </div>
            </Show>
            <Show when="signed-out">
              <div className="flex flex-col gap-3">
                <Link href="/sign-in" className="w-full">
                  <Button variant="outline" className="w-full">{t('nav.signin')}</Button>
                </Link>
                <Link href="/sign-up" className="w-full">
                  <Button className="w-full">{t('nav.signup')}</Button>
                </Link>
              </div>
            </Show>
          </div>
        </div>
      )}

      <main className="flex-1 w-full max-w-[1400px] mx-auto px-4 md:px-8 xl:px-12">
        {children}
      </main>

      <footer className="mt-auto py-8 border-t border-border bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <p className="text-sm text-muted-foreground leading-relaxed balance-text">
              {t('disclaimer.banner')}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
