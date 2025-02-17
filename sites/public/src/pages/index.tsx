import React, { useContext, useEffect, useState } from "react"
import Head from "next/head"
import {
  AlertBox,
  LinkButton,
  t,
  SiteAlert,
  AppearanceSizeType,
  InfoCard,
} from "@bloom-housing/ui-components"
import { ActionBlock, DoorwayHero } from "@bloom-housing/doorway-ui-components"
import { Heading } from "@bloom-housing/ui-seeds"
import { PageView, pushGtmEvent, AuthContext } from "@bloom-housing/shared-helpers"
import { UserStatus } from "../lib/constants"
import Layout from "../layouts/application"
import { ConfirmationModal } from "../components/account/ConfirmationModal"
import { MetaTags } from "../components/shared/MetaTags"
import { LandingSearch } from "../components/listings/search/LandingSearch"
import { FormOption } from "../components/listings/search/ListingsSearchModal"
import { locations } from "../components/listings/search/ListingsSearchCombined"
import { Jurisdiction } from "@bloom-housing/shared-helpers/src/types/backend-swagger"

interface IndexProps {
  jurisdiction: Jurisdiction
  bedrooms: FormOption[]
  counties: FormOption[]
}

export default function Home(props: IndexProps) {
  const blankAlertInfo = {
    alertMessage: null,
    alertType: null,
  }
  const { profile } = useContext(AuthContext)
  const [alertInfo, setAlertInfo] = useState(blankAlertInfo)

  useEffect(() => {
    pushGtmEvent<PageView>({
      event: "pageView",
      pageTitle: "Doorway Housing Portal",
      status: profile ? UserStatus.LoggedIn : UserStatus.NotLoggedIn,
    })
  }, [profile])

  const notificationsSignUpURL = process.env.notificationsSignUpUrl
  const metaDescription = t("pageDescription.welcome")
  const metaImage = t("welcome.personWithChildAlt")
  const alertClasses = "flex-grow mt-6 max-w-6xl w-full"
  return (
    <Layout>
      <Head>
        <title>{t("nav.siteTitle")}</title>
      </Head>
      <MetaTags title={t("nav.siteTitle")} image={metaImage} description={metaDescription} />
      <div className="flex absolute w-full flex-col items-center">
        <SiteAlert type="alert" className={alertClasses} />
        <SiteAlert type="success" className={alertClasses} timeout={30000} />
      </div>
      {alertInfo.alertMessage && (
        <AlertBox
          className=""
          onClose={() => setAlertInfo(blankAlertInfo)}
          type={alertInfo.alertType}
        >
          {alertInfo.alertMessage}
        </AlertBox>
      )}
      <DoorwayHero
        title={t("welcome.findAffordableHousing")}
        offsetImage={"images/person-with-child.jpg"}
        offsetImageAlt={t("welcome.personWithChildAlt")}
      >
        <LandingSearch bedrooms={props.bedrooms} counties={locations} />
      </DoorwayHero>
      <ActionBlock
        className="p-12"
        header={<Heading priority={2}>{t("welcome.introduction")}</Heading>}
        subheader={t("welcome.useDoorway")}
        body={
          <span>
            {t("welcome.moreListingsComing")}
            <br />
            {t("welcome.useDoorwayBAHFAtext")}
            <br />
            <a
              className="lined"
              href="https://mtc.ca.gov/about-mtc/authorities/bay-area-housing-finance-authority-bahfa"
              target="_blank"
            >
              {t("welcome.useDoorwayBAHFAlink")}
            </a>
          </span>
        }
        background="secondary-lighter"
        actions={[
          <LinkButton
            className="is-borderless is-inline is-unstyled underline text-primary"
            href="/help/get-started"
            key={"get-started"}
            size={AppearanceSizeType.small}
            normalCase
            icon="arrowForward"
            iconPlacement="right"
          >
            {t("welcome.learnHowToUseDoorway")}
          </LinkButton>,
        ]}
      />
      <div className="homepage-extra warn">
        <div className="action-blocks pb-4 pt-4 w-full space-between items-start">
          <InfoCard
            title={t("welcome.needOtherHelp")}
            className="flex-1 is-inline is-normal text-left"
          >
            <img
              src={"images/person-holding-hands.jpg"}
              alt={t("welcome.peopleHoldingHandsAlt")}
              className={"mt-4 mb-4 rounded-3xl"}
            />
            <p className="text-gray-950 text__medium-normal mb-4 font-semibold">
              {t("welcome.emergencyHousing")}
            </p>
            <ul className="text__medium-normal list-disc ml-5">
              <li>{t("welcome.call211")}</li>
              <li>{t("welcome.findRelatedServices")}</li>
            </ul>
            <LinkButton
              key={"get-help"}
              className="is-primary"
              href={"/help/housing-help"}
              size={AppearanceSizeType.small}
            >
              {t("welcome.getHelp")}
            </LinkButton>
          </InfoCard>
          <InfoCard
            title={t("welcome.haveQuestions")}
            className="flex-1 is-inline is-normal text-left"
          >
            <img
              src={"images/person-laptop.jpg"}
              alt={t("welcome.personLaptopAlt")}
              className={"mt-4 mb-4 rounded-3xl"}
            />
            <p className="text-gray-950 text__medium-normal mb-4 font-semibold">
              {t("welcome.getAnswers")}
            </p>
            <ul className="text__medium-normal list-disc ml-5">
              <li>{t("welcome.whatHappens")}</li>
              <li>{t("welcome.incomeAffectRent")}</li>
              <li>{t("welcome.whatDoesAffordableMean")}</li>
            </ul>
            <LinkButton
              key={"learn-more"}
              className="is-primary"
              href={"/help/questions"}
              size={AppearanceSizeType.small}
            >
              {t("welcome.learnMore")}
            </LinkButton>
          </InfoCard>
        </div>
      </div>
      {notificationsSignUpURL && (
        <ActionBlock
          className="p-12"
          header={
            <Heading className="" priority={2}>
              {t("t.signUpForAlerts")}
            </Heading>
          }
          subheader={t("t.subscribeToListingAlerts")}
          background="primary-lightest"
          actions={[
            <LinkButton
              key={"sign-up"}
              className="is-primary"
              href={notificationsSignUpURL}
              newTab={true}
              size={AppearanceSizeType.small}
            >
              {t("t.signUp")}
            </LinkButton>,
          ]}
        />
      )}
      <ConfirmationModal
        setSiteAlertMessage={(alertMessage, alertType) => setAlertInfo({ alertMessage, alertType })}
      />
    </Layout>
  )
}
