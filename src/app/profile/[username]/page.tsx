import type { Metadata } from "next"
import { notFound } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { BookOpen } from "lucide-react"
import { getTranslations } from "next-intl/server"
import { MessageCircle, Pencil } from "lucide-react"
import { getPublicProfile } from "@/actions/profile"
import { SiteNav } from "@/components/shared/site-nav"
import { StarRating } from "@/components/library/star-rating"
import { FollowButton } from "@/components/profile/follow-button"
import { Button } from "@/components/ui/button"

interface Props {
  params: Promise<{ username: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params
  const { profile } = await getPublicProfile(username)
  return { title: profile ? `${profile.displayName} (@${profile.username})` : "Profile" }
}

export default async function ProfilePage({ params }: Props) {
  const { username } = await params
  const [{ error, profile }, t, tMessages] = await Promise.all([
    getPublicProfile(username),
    getTranslations("Profile"),
    getTranslations("Messages"),
  ])

  if (error || !profile) notFound()

  return (
    <>
      <SiteNav active={profile.isOwnProfile ? "me" : undefined} />
      <main className="flex-1">
        <div className="container mx-auto pt-4 sm:pt-8 pb-12 px-4 max-w-4xl">
          <section className="mb-10">
            {/* Decorative banner */}
            <div aria-hidden className="h-28 sm:h-40 rounded-3xl bg-cover-fallback opacity-90" />

            <div className="px-2 sm:px-6">
              <div className="flex items-end justify-between gap-3 -mt-12 sm:-mt-16">
                <div className="relative h-24 w-24 sm:h-32 sm:w-32 rounded-full overflow-hidden bg-muted ring-4 ring-background shadow-lift shrink-0">
                  {profile.avatarUrl ? (
                    <Image
                      src={profile.avatarUrl}
                      alt=""
                      fill
                      className="object-cover"
                      style={{ objectPosition: `center ${profile.avatarPositionY}%` }}
                      sizes="128px"
                      priority
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-cover-fallback">
                      <span className="text-4xl font-bold text-white" aria-hidden>
                        {profile.displayName[0]?.toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex justify-end items-center gap-2 pb-1">
                  {profile.isOwnProfile ? (
                    <Button asChild variant="outline">
                      <Link href="/settings">
                        <Pencil aria-hidden />
                        {t("editProfile")}
                      </Link>
                    </Button>
                  ) : (
                    <>
                      <Button asChild variant="outline" size="icon" className="sm:w-auto sm:px-5">
                        <Link href={`/messages/u/${profile.username}`} aria-label={tMessages("title")}>
                          <MessageCircle aria-hidden />
                          <span className="hidden sm:inline">{tMessages("title")}</span>
                        </Link>
                      </Button>
                      <FollowButton userId={profile.id} initialIsFollowing={profile.isFollowing} />
                    </>
                  )}
                </div>
              </div>

              <h1 className="text-3xl sm:text-4xl font-semibold mt-4">{profile.displayName}</h1>
              <p className="text-muted-foreground">@{profile.username}</p>
              {profile.bio && <p className="mt-3 max-w-prose leading-relaxed">{profile.bio}</p>}

              <ul className="flex flex-wrap items-center gap-x-5 gap-y-1 mt-4 text-sm text-muted-foreground">
                <li>{t("followers", { count: profile.followerCount })}</li>
                <li>{t("followingCount", { count: profile.followingCount })}</li>
                {profile.libraryCount !== null && <li>{t("libraryCount", { count: profile.libraryCount })}</li>}
              </ul>
            </div>
          </section>

          {profile.books.length > 0 && (
            <section className="mb-10">
              <h2 className="text-2xl font-semibold mb-4">{t("publishedBooks")}</h2>
              <div className="bg-card border rounded-2xl shadow-soft p-4 sm:p-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
                {profile.books.map((book) => (
                  <Link key={book.id} href={`/books/${book.id}`} className="group block">
                    <div className="aspect-[2/3] relative overflow-hidden rounded-xl bg-muted border shadow-soft">
                      {book.coverUrl ? (
                        <Image
                          src={book.coverUrl}
                          alt={book.title}
                          fill
                          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 16vw"
                          className="object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center bg-cover-fallback">
                          <span className="text-3xl font-bold text-white select-none">
                            {book.title[0]?.toUpperCase() ?? <BookOpen />}
                          </span>
                        </div>
                      )}
                    </div>
                    <p className="text-sm font-semibold mt-2 line-clamp-2 group-hover:text-primary transition-colors">{book.title}</p>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {profile.publicShelves.length > 0 && (
            <section className="mb-10">
              <h2 className="text-2xl font-semibold mb-4">{t("shelves")}</h2>
              <div className="bg-card border rounded-2xl shadow-soft p-2 sm:p-3 space-y-1">
                {profile.publicShelves.map((shelf) => (
                  <div
                    key={shelf.id}
                    className="flex items-center justify-between gap-3 px-3 py-3 rounded-xl text-sm"
                  >
                    <span className="font-medium">{shelf.name}</span>
                    <span className="text-muted-foreground">
                      {t("shelfBookCount", { count: shelf.bookCount })}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {profile.ratings && profile.ratings.length > 0 && (
            <section>
              <h2 className="text-2xl font-semibold mb-4">{t("ratings")}</h2>
              <div className="bg-card border rounded-2xl shadow-soft p-2 sm:p-3 space-y-1">
                {profile.ratings.map((r) => (
                  <Link
                    key={r.bookId}
                    href={`/books/${r.bookId}`}
                    className="flex items-center justify-between gap-3 px-3 py-3 rounded-xl text-sm hover:bg-muted transition-colors"
                  >
                    <span className="font-medium">{r.bookTitle}</span>
                    <StarRating value={r.rating} readOnly size="sm" />
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>
    </>
  )
}
