import type { Metadata } from "next"
import { notFound } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { BookOpen } from "lucide-react"
import { getTranslations } from "next-intl/server"
import { MessageCircle } from "lucide-react"
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
      <SiteNav />
      <main className="bg-white min-h-[calc(100vh-4rem)]">
        <div className="container mx-auto py-10 px-4 max-w-4xl">
          <div className="flex items-center gap-5 mb-8 bg-muted rounded-xl p-6">
            <div className="relative h-[120px] w-[120px] rounded-full overflow-hidden bg-muted border shrink-0">
              {profile.avatarUrl ? (
                <Image
                  src={profile.avatarUrl}
                  alt={profile.displayName}
                  fill
                  className="object-cover"
                  style={{ objectPosition: `center ${profile.avatarPositionY}%` }}
                  sizes="120px"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#FF8C6B] to-[#7C3F82]">
                  <span className="text-4xl font-bold text-white">
                    {profile.displayName[0]?.toUpperCase()}
                  </span>
                </div>
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold">{profile.displayName}</h1>
                  <p className="text-sm text-muted-foreground">@{profile.username}</p>
                </div>
                {!profile.isOwnProfile && (
                  <div className="flex items-center gap-2 shrink-0">
                    <Button asChild variant="outline" size="sm" className="gap-1.5">
                      <Link href={`/messages/u/${profile.username}`}>
                        <MessageCircle className="h-4 w-4" />
                        {tMessages("title")}
                      </Link>
                    </Button>
                    <FollowButton userId={profile.id} initialIsFollowing={profile.isFollowing} />
                  </div>
                )}
              </div>
              {profile.bio && <p className="text-sm mt-2 max-w-md">{profile.bio}</p>}
              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                <span>{t("followers", { count: profile.followerCount })}</span>
                <span>{t("followingCount", { count: profile.followingCount })}</span>
              </div>
              {profile.libraryCount !== null && (
                <p className="text-sm text-muted-foreground mt-2">
                  {t("libraryCount", { count: profile.libraryCount })}
                </p>
              )}
            </div>
          </div>

          {profile.books.length > 0 && (
            <section className="mb-8">
              <h2 className="text-lg font-bold text-foreground mb-4">{t("publishedBooks")}</h2>
              <div className="bg-muted rounded-xl p-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-5">
                {profile.books.map((book) => (
                  <Link key={book.id} href={`/books/${book.id}`} className="group block">
                    <div className="aspect-[2/3] relative overflow-hidden rounded-lg bg-muted border">
                      {book.coverUrl ? (
                        <Image
                          src={book.coverUrl}
                          alt={book.title}
                          fill
                          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 16vw"
                          className="object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#FF8C6B] to-[#7C3F82]">
                          <span className="text-3xl font-bold text-white select-none">
                            {book.title[0]?.toUpperCase() ?? <BookOpen />}
                          </span>
                        </div>
                      )}
                    </div>
                    <p className="text-sm font-medium mt-2 line-clamp-2">{book.title}</p>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {profile.publicShelves.length > 0 && (
            <section className="mb-8">
              <h2 className="text-lg font-bold text-foreground mb-4">{t("shelves")}</h2>
              <div className="bg-muted rounded-xl p-6 space-y-2">
                {profile.publicShelves.map((shelf) => (
                  <div
                    key={shelf.id}
                    className="flex items-center justify-between px-3 py-2.5 bg-white/70 rounded-lg text-sm"
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
              <h2 className="text-lg font-bold text-foreground mb-4">{t("ratings")}</h2>
              <div className="bg-muted rounded-xl p-6 space-y-2">
                {profile.ratings.map((r) => (
                  <Link
                    key={r.bookId}
                    href={`/books/${r.bookId}`}
                    className="flex items-center justify-between px-3 py-2.5 bg-white/70 rounded-lg text-sm hover:bg-white transition-colors"
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
