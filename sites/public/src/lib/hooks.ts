import { useContext, useEffect, useState } from "react"
import axios from "axios"
//import qs from "qs"
import { useRouter } from "next/router"
import { ApplicationStatusProps, isInternalLink } from "@bloom-housing/ui-components"
import {
  // EnumListingFilterParamsComparison,
  Jurisdiction,
  Listing,
  // ListingFilterParams,
  // ListingOrderByKeys,
  // ListingsStatusEnum,
  // OrderByEnum,
} from "@bloom-housing/shared-helpers/src/types/backend-swagger"
import { ParsedUrlQuery } from "querystring"
import { AppSubmissionContext } from "./applications/AppSubmissionContext"
import { getListingApplicationStatus } from "./helpers"
import { useRequireLoggedInUser } from "@bloom-housing/shared-helpers"

export const useRedirectToPrevPage = (defaultPath = "/") => {
  const router = useRouter()

  return (queryParams: ParsedUrlQuery = {}) => {
    const redirectUrl =
      typeof router.query.redirectUrl === "string" && isInternalLink(router.query.redirectUrl)
        ? router.query.redirectUrl
        : defaultPath
    const redirectParams = { ...queryParams }
    if (router.query.listingId) redirectParams.listingId = router.query.listingId

    return router.push({ pathname: redirectUrl, query: redirectParams })
  }
}

export const useFormConductor = (stepName: string) => {
  useRequireLoggedInUser("/", !process.env.showMandatedAccounts)
  const context = useContext(AppSubmissionContext)
  const conductor = context.conductor

  conductor.stepTo(stepName)

  useEffect(() => {
    conductor.skipCurrentStepIfNeeded()
  }, [conductor])
  return context
}

export const useGetApplicationStatusProps = (listing: Listing): ApplicationStatusProps => {
  const [props, setProps] = useState({ content: "", subContent: "" })

  useEffect(() => {
    if (!listing) return

    const { content, subContent } = getListingApplicationStatus(listing)

    setProps({ content, subContent })
  }, [listing])

  return props
}

// These functions were sparsely used and/or completely ignored, so I'm commenting
// them out.  If it turns out they are needed later then it should be easy to add
// them back by uncommenting, but make sure the logic still matches expectations.
/*
export async function fetchBaseListingData({
  additionalFilters,
  orderBy,
  orderDir,
  limit,
}: {
  additionalFilters?: ListingFilterParams[]
  orderBy?: ListingOrderByKeys[]
  orderDir?: OrderByEnum[]
  limit?: string
}) {
  let listings = []
  try {
    let filter: ListingFilterParams[] = []

    if (additionalFilters) {
      filter = filter.concat(additionalFilters)
    }
    const params: {
      view: string
      limit: string
      filter: ListingFilterParams[]
      orderBy?: ListingOrderByKeys[]
      orderDir?: OrderByEnum[]
    } = {
      view: "base",
      limit: limit || "all",
      filter,
    }
    if (orderBy) {
      params.orderBy = orderBy
    }
    if (orderDir) {
      params.orderDir = orderDir
    }

    const response = await axios.get(getListingServiceUrl(), {
      params,
      paramsSerializer: (params) => {
        return qs.stringify(params)
      },
    })

    listings = response.data?.items
  } catch (e) {
    console.log("fetchBaseListingData error: ", e)
  }

  return listings
}

export async function fetchOpenListings() {
  return await fetchBaseListingData({
    additionalFilters: [
      {
        $comparison: EnumListingFilterParamsComparison["="],
        status: ListingsStatusEnum.active,
      },
    ],
    orderBy: [ListingOrderByKeys.mostRecentlyPublished],
    orderDir: [OrderByEnum.desc],
  })
}

export async function fetchClosedListings() {
  return await fetchBaseListingData({
    additionalFilters: [
      {
        $comparison: EnumListingFilterParamsComparison["="],
        status: ListingsStatusEnum.closed,
      },
    ],
    orderBy: [ListingOrderByKeys.mostRecentlyClosed],
    orderDir: [OrderByEnum.desc],
    limit: "10",
  })
}
*/

let jurisdiction: Jurisdiction | null = null

export async function fetchJurisdictionByName(backendApiBase: string, jurisdictionName: string) {
  try {
    if (jurisdiction) {
      return jurisdiction
    }

    const jurisdictionRes = await axios.get(
      `${backendApiBase}/jurisdictions/byName/${jurisdictionName}`
    )
    jurisdiction = jurisdictionRes?.data
  } catch (error) {
    console.log("error = ", error)
  }

  return jurisdiction
}
