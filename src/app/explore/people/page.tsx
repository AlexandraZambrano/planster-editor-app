import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { Users } from "lucide-react"
import { searchUsers, getFollowSuggestions } from "@/actions/people"
import { SiteNav } from "@/components/shared/site-nav"
import { ExploreTabs } from "@/components/discovery/explore-tabs"
import { PeopleSearchInput } from "@/components/discovery/people-search-input"
import { PersonCard } from "@/components/discovery/person-card"

export const metadata: Metadata = { title: "People" }

interface Props {
  searchParams: Promise<{ q?: string }>
}

export default async function ExplorePeoplePage({ searchParams }: Props) {
  const { q } = await searchParams
  const query = q?.trim() ?? ""

  const [t, tExplore] = await Promise.all([getTranslations("People"), getTranslations("Explore")])

  return (
    <>
      <SiteNav active="explore" />
      <main className="container mx-auto py-10 px-4 max-w-4xl">
        <h1 className="text-2xl font-bold mb-6">{tExplore("title")}</h1>
        <ExploreTabs active="people" booksLabel={t("tabBooks")} peopleLabel={t("tabPeople")} />

        <PeopleSearchInput />

        {query ? <SearchResults query={query} noResultsLabel={t("noResults")} /> : <Suggestions />}
      </main>
    </>
  )
}

async function SearchResults({ query, noResultsLabel }: { query: string; noResultsLabel: string }) {
  const { people } = await searchUsers(query)

  if (people.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
        <Users className="h-12 w-12 mb-4 opacity-30" />
        <p className="text-lg font-medium">{noResultsLabel}</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {people.map((person) => (
        <PersonCard key={person.id} person={person} />
      ))}
    </div>
  )
}

async function Suggestions() {
  const [{ suggestions }, t] = await Promise.all([getFollowSuggestions(), getTranslations("People")])

  return (
    <section>
      <h2 className="text-sm font-bold text-foreground mb-3">{t("suggestionsTitle")}</h2>
      {suggestions.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("noSuggestions")}</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {suggestions.map((person) => (
            <PersonCard
              key={person.id}
              person={person}
              caption={person.connectorName ? t("connectedThrough", { name: person.connectorName }) : null}
            />
          ))}
        </div>
      )}
    </section>
  )
}
