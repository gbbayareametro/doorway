import React, { useState, useCallback, useContext, useEffect } from "react"
import { useRouter } from "next/router"
import dayjs from "dayjs"
import {
  t,
  Form,
  AlertBox,
  setSiteAlertMessage,
  LoadingOverlay,
  Modal,
  Tabs,
  TabList,
  Tab,
  TabPanel,
  LatitudeLongitude,
  Icon,
} from "@bloom-housing/ui-components"
import { Button } from "@bloom-housing/ui-seeds"
import { AuthContext, listingSectionQuestions } from "@bloom-housing/shared-helpers"
import {
  ListingCreate,
  ListingEventsTypeEnum,
  ListingUpdate,
  ListingsStatusEnum,
  MultiselectQuestion,
  MultiselectQuestionsApplicationSectionEnum,
} from "@bloom-housing/shared-helpers/src/types/backend-swagger"
import { useForm, FormProvider } from "react-hook-form"
import {
  AlertErrorType,
  FormListing,
  TempEvent,
  TempUnit,
  formDefaults,
} from "../../../lib/listings/formTypes"
import ListingDataPipeline from "../../../lib/listings/ListingDataPipeline"
import ListingFormActions, { ListingFormActionsType } from "../ListingFormActions"
import AdditionalDetails from "./sections/AdditionalDetails"
import AdditionalEligibility from "./sections/AdditionalEligibility"
import LeasingAgent from "./sections/LeasingAgent"
import AdditionalFees from "./sections/AdditionalFees"
import Units from "./sections/Units"
import BuildingDetails from "./sections/BuildingDetails"
import ListingIntro from "./sections/ListingIntro"
import ListingPhotos from "./sections/ListingPhotos"
import BuildingFeatures from "./sections/BuildingFeatures"
import RankingsAndResults from "./sections/RankingsAndResults"
import ApplicationAddress from "./sections/ApplicationAddress"
import ApplicationDates from "./sections/ApplicationDates"
import LotteryResults from "./sections/LotteryResults"
import ApplicationTypes from "./sections/ApplicationTypes"
import SelectAndOrder from "./sections/SelectAndOrder"
import CommunityType from "./sections/CommunityType"
import BuildingSelectionCriteria from "./sections/BuildingSelectionCriteria"
import { getReadableErrorMessage } from "../PaperListingDetails/sections/helpers"
import { useJurisdictionalMultiselectQuestionList } from "../../../lib/hooks"
import { StatusBar } from "../../../components/shared/StatusBar"
import { getListingStatusTag } from "../helpers"
import RequestChangesModal from "./RequestChangesModal"

type ListingFormProps = {
  listing?: FormListing
  editMode?: boolean
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const ListingForm = ({ listing, editMode }: ListingFormProps) => {
  const defaultValues = editMode ? listing : formDefaults
  const formMethods = useForm<FormListing>({
    defaultValues,
    shouldUnregister: false,
  })

  const router = useRouter()

  const { listingsService, profile } = useContext(AuthContext)

  const [tabIndex, setTabIndex] = useState(0)
  const [alert, setAlert] = useState<AlertErrorType | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [units, setUnits] = useState<TempUnit[]>([])
  const [openHouseEvents, setOpenHouseEvents] = useState<TempEvent[]>([])
  const [preferences, setPreferences] = useState<MultiselectQuestion[]>(
    listingSectionQuestions(listing, MultiselectQuestionsApplicationSectionEnum.preferences)?.map(
      (listingPref) => {
        return { ...listingPref?.multiselectQuestions }
      }
    ) ?? []
  )
  const [programs, setPrograms] = useState<MultiselectQuestion[]>(
    listingSectionQuestions(listing, MultiselectQuestionsApplicationSectionEnum.programs)?.map(
      (listingProg) => {
        return { ...listingProg?.multiselectQuestions }
      }
    )
  )

  const [latLong, setLatLong] = useState<LatitudeLongitude>({
    latitude: listing?.listingsBuildingAddress?.latitude ?? null,
    longitude: listing?.listingsBuildingAddress?.longitude ?? null,
  })
  const [customMapPositionChosen, setCustomMapPositionChosen] = useState(
    listing?.customMapPin || false
  )

  const setLatitudeLongitude = (latlong: LatitudeLongitude) => {
    if (!loading) {
      setLatLong(latlong)
    }
  }

  const [closeModal, setCloseModal] = useState(false)
  const [publishModal, setPublishModal] = useState(false)
  const [lotteryResultsDrawer, setLotteryResultsDrawer] = useState(false)
  const [listingIsAlreadyLiveModal, setListingIsAlreadyLiveModal] = useState(false)
  const [submitForApprovalModal, setSubmitForApprovalModal] = useState(false)
  const [requestChangesModal, setRequestChangesModal] = useState(false)

  useEffect(() => {
    if (listing?.units) {
      const tempUnits = listing.units.map((unit, i) => ({
        ...unit,
        tempId: i + 1,
      }))
      setUnits(tempUnits)
    }

    if (listing?.listingEvents) {
      setOpenHouseEvents(
        listing.listingEvents
          .filter((event) => event.type === ListingEventsTypeEnum.openHouse)
          .map((event) => {
            return {
              ...event,
              startTime: new Date(event.startTime),
              endTime: new Date(event.endTime),
            }
          })
          .sort((a, b) => (dayjs(a.startTime).isAfter(b.startTime) ? 1 : -1))
      )
    }
  }, [listing?.units, listing?.listingEvents, setUnits, setOpenHouseEvents])

  // eslint-disable-next-line @typescript-eslint/unbound-method
  const { getValues, setError, clearErrors, reset } = formMethods

  const triggerSubmitWithStatus = (
    confirm?: boolean,
    status?: ListingsStatusEnum,
    newData?: Partial<FormListing>
  ) => {
    if (confirm && status === ListingsStatusEnum.active) {
      if (listing?.status === ListingsStatusEnum.active) {
        setListingIsAlreadyLiveModal(true)
      } else {
        setPublishModal(true)
      }
      return
    }
    let formData = { ...defaultValues, ...getValues(), ...(newData || {}) }
    if (status) {
      formData = { ...formData, status }
    }
    void onSubmit(formData)
  }

  const onSubmit = useCallback(
    async (formData: FormListing) => {
      if (!loading) {
        try {
          setLoading(true)
          clearErrors()

          const dataPipeline = new ListingDataPipeline(formData, {
            preferences,
            programs,
            units,
            openHouseEvents,
            profile: profile,
            latLong,
            customMapPositionChosen,
          })
          const formattedData = await dataPipeline.run()
          let result
          if (editMode) {
            result = await listingsService.update({
              id: listing.id,
              body: { id: listing.id, ...(formattedData as unknown as ListingUpdate) },
            })
          } else {
            result = await listingsService.create({
              body: formattedData as unknown as ListingCreate,
            })
          }

          reset(formData)

          if (result) {
            const getToast = (oldStatus: ListingsStatusEnum, newStatus: ListingsStatusEnum) => {
              const toasts = {
                [ListingsStatusEnum.pendingReview]: t("listings.approval.submittedForReview"),
                [ListingsStatusEnum.changesRequested]: t("listings.listingStatus.changesRequested"),
                [ListingsStatusEnum.active]: t("listings.approval.listingPublished"),
                [ListingsStatusEnum.pending]: t("listings.approval.listingUnpublished"),
                [ListingsStatusEnum.closed]: t("listings.approval.listingClosed"),
              }
              if (oldStatus !== newStatus) {
                if (!listing && newStatus === ListingsStatusEnum.pending)
                  return t("listings.listingUpdated")
                return toasts[newStatus]
              }

              return t("listings.listingUpdated")
            }
            setSiteAlertMessage(getToast(listing?.status, formattedData?.status), "success")

            await router.push(`/listings/${result.id}`)
          }
          setLoading(false)
        } catch (err) {
          reset(formData)
          setLoading(false)
          clearErrors()
          const { data } = err.response || {}
          if (data?.statusCode === 400) {
            data?.message?.forEach((errorMessage: string) => {
              const fieldName = errorMessage.split(" ")[0]
              const readableError = getReadableErrorMessage(errorMessage)
              if (readableError) {
                setError(fieldName, { message: readableError })
                if (fieldName === "buildingAddress" || fieldName === "buildingAddress.nested") {
                  const setIfEmpty = (
                    fieldName: string,
                    fieldValue: string,
                    errorMessage: string
                  ) => {
                    if (!fieldValue) {
                      setError(fieldName, { message: errorMessage })
                    }
                  }
                  const address = formData.listingsBuildingAddress
                  setIfEmpty(`buildingAddress.city`, address.city, readableError)
                  setIfEmpty(`buildingAddress.county`, address.county, readableError)
                  setIfEmpty(`buildingAddress.state`, address.state, readableError)
                  setIfEmpty(`buildingAddress.street`, address.street, readableError)
                  setIfEmpty(`buildingAddress.zipCode`, address.zipCode, readableError)
                }
              }
            })
            setAlert("form")
          } else if (data?.message === "email failed") {
            setSiteAlertMessage(t("errors.alert.listingsApprovalEmailError"), "warn")
            await router.push(`/listings/${formData.id}/`)
          } else setAlert("api")
        }
      }
    },
    [
      units,
      openHouseEvents,
      editMode,
      listingsService,
      listing,
      router,
      preferences,
      programs,
      latLong,
      customMapPositionChosen,
      clearErrors,
      loading,
      reset,
      setError,
      profile,
    ]
  )

  return loading === true ? null : (
    <>
      <LoadingOverlay isLoading={loading}>
        <>
          <StatusBar>{getListingStatusTag(listing?.status)}</StatusBar>

          <FormProvider {...formMethods}>
            <section className="bg-primary-lighter py-5">
              <div className="max-w-screen-xl px-5 mx-auto">
                {alert && (
                  <AlertBox className="mb-5" onClose={() => setAlert(null)} closeable type="alert">
                    {alert === "form" ? t("listings.fieldError") : t("errors.alert.badRequest")}
                  </AlertBox>
                )}

                <Form id="listing-form">
                  <div className="flex flex-row flex-wrap">
                    <div className="md:w-9/12 pb-24">
                      <Tabs
                        forceRenderTabPanel={true}
                        selectedIndex={tabIndex}
                        onSelect={(index) => setTabIndex(index)}
                      >
                        <TabList>
                          <Tab>Listing Details</Tab>
                          <Tab>Application Process</Tab>
                        </TabList>
                        <TabPanel>
                          <ListingIntro jurisdictions={profile.jurisdictions} />
                          <ListingPhotos />
                          <BuildingDetails
                            listing={listing}
                            setLatLong={setLatitudeLongitude}
                            latLong={latLong}
                            customMapPositionChosen={customMapPositionChosen}
                            setCustomMapPositionChosen={setCustomMapPositionChosen}
                          />
                          <CommunityType listing={listing} />
                          <Units
                            units={units}
                            setUnits={setUnits}
                            disableUnitsAccordion={listing?.disableUnitsAccordion}
                          />
                          <SelectAndOrder
                            addText={t("listings.addPreference")}
                            drawerTitle={t("listings.addPreferences")}
                            editText={t("listings.editPreferences")}
                            listingData={preferences || []}
                            setListingData={setPreferences}
                            subtitle={t("listings.sections.housingPreferencesSubtext")}
                            title={t("listings.sections.housingPreferencesTitle")}
                            drawerButtonText={t("listings.selectPreferences")}
                            dataFetcher={useJurisdictionalMultiselectQuestionList}
                            formKey={"preference"}
                            applicationSection={
                              MultiselectQuestionsApplicationSectionEnum.preferences
                            }
                          />
                          <SelectAndOrder
                            addText={"Add program"}
                            drawerTitle={"Add programs"}
                            editText={"Edit programs"}
                            listingData={programs || []}
                            setListingData={setPrograms}
                            subtitle={
                              "Tell us about any additional housing programs related to this listing."
                            }
                            title={"Housing Programs"}
                            drawerButtonText={"Select programs"}
                            dataFetcher={useJurisdictionalMultiselectQuestionList}
                            formKey={"program"}
                            applicationSection={MultiselectQuestionsApplicationSectionEnum.programs}
                          />
                          <AdditionalFees existingUtilities={listing?.listingUtilities} />
                          <BuildingFeatures existingFeatures={listing?.listingFeatures} />
                          <AdditionalEligibility defaultText={listing?.rentalAssistance} />
                          <BuildingSelectionCriteria />
                          <AdditionalDetails />
                          <div className="text-right -mr-8 -mt-8 relative" style={{ top: "7rem" }}>
                            <Button
                              id="applicationProcessButton"
                              type="button"
                              variant="primary-outlined"
                              tailIcon={<Icon symbol="arrowForward" size="small" />}
                              onClick={() => {
                                setTabIndex(1)
                                window.scrollTo({ top: 0, behavior: "smooth" })
                              }}
                            >
                              Application Process
                            </Button>
                          </div>
                        </TabPanel>
                        <TabPanel>
                          <RankingsAndResults listing={listing} />
                          <LeasingAgent />
                          <ApplicationTypes listing={listing} />
                          <ApplicationAddress listing={listing} />
                          <ApplicationDates
                            listing={listing}
                            openHouseEvents={openHouseEvents}
                            setOpenHouseEvents={setOpenHouseEvents}
                          />

                          <div className="-ml-8 -mt-8 relative" style={{ top: "7rem" }}>
                            <Button
                              type="button"
                              variant="primary-outlined"
                              leadIcon={<Icon symbol="arrowBack" size="small" />}
                              onClick={() => {
                                setTabIndex(0)
                                window.scrollTo({ top: 0, behavior: "smooth" })
                              }}
                            >
                              Listing Details
                            </Button>
                          </div>
                        </TabPanel>
                      </Tabs>

                      {listing?.status === ListingsStatusEnum.closed && (
                        <LotteryResults
                          submitCallback={(data) => {
                            triggerSubmitWithStatus(false, ListingsStatusEnum.closed, data)
                          }}
                          drawerState={lotteryResultsDrawer}
                          showDrawer={(toggle: boolean) => setLotteryResultsDrawer(toggle)}
                        />
                      )}
                    </div>

                    <aside className="md:w-3/12 md:pl-6">
                      <ListingFormActions
                        type={editMode ? ListingFormActionsType.edit : ListingFormActionsType.add}
                        showCloseListingModal={() => setCloseModal(true)}
                        showLotteryResultsDrawer={() => setLotteryResultsDrawer(true)}
                        showRequestChangesModal={() => setRequestChangesModal(true)}
                        showSubmitForApprovalModal={() => setSubmitForApprovalModal(true)}
                        submitFormWithStatus={triggerSubmitWithStatus}
                      />
                    </aside>
                  </div>
                </Form>
              </div>
            </section>
          </FormProvider>
        </>
      </LoadingOverlay>

      <Modal
        open={!!closeModal}
        title={t("t.areYouSure")}
        ariaDescription={t("listings.closeThisListing")}
        onClose={() => setCloseModal(false)}
        actions={[
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setCloseModal(false)
              triggerSubmitWithStatus(false, ListingsStatusEnum.closed)
            }}
            size="sm"
          >
            {t("listings.actions.close")}
          </Button>,
          <Button
            type="button"
            variant="primary-outlined"
            onClick={() => {
              setCloseModal(false)
            }}
            size="sm"
          >
            {t("t.cancel")}
          </Button>,
        ]}
      >
        {t("listings.closeThisListing")}
      </Modal>

      <Modal
        open={!!publishModal}
        title={t("t.areYouSure")}
        ariaDescription={t("listings.publishThisListing")}
        onClose={() => setPublishModal(false)}
        actions={[
          <Button
            id="publishButtonConfirm"
            type="button"
            variant="success"
            onClick={() => {
              setPublishModal(false)
              triggerSubmitWithStatus(false, ListingsStatusEnum.active)
            }}
            size="sm"
          >
            {t("listings.actions.publish")}
          </Button>,
          <Button
            type="button"
            variant="primary-outlined"
            onClick={() => {
              setPublishModal(false)
            }}
            size="sm"
          >
            {t("t.cancel")}
          </Button>,
        ]}
      >
        {t("listings.publishThisListing")}
      </Modal>

      <Modal
        open={listingIsAlreadyLiveModal}
        title={t("t.areYouSure")}
        ariaDescription={t("listings.listingIsAlreadyLive")}
        onClose={() => setListingIsAlreadyLiveModal(false)}
        actions={[
          <Button
            id="saveAlreadyLiveListingButtonConfirm"
            type="button"
            variant="success"
            onClick={() => {
              setListingIsAlreadyLiveModal(false)
              triggerSubmitWithStatus(false, ListingsStatusEnum.active)
            }}
            size="sm"
          >
            {t("t.save")}
          </Button>,
          <Button
            type="button"
            variant="primary-outlined"
            onClick={() => {
              setListingIsAlreadyLiveModal(false)
            }}
            size="sm"
          >
            {t("t.cancel")}
          </Button>,
        ]}
      >
        {t("listings.listingIsAlreadyLive")}
      </Modal>

      <Modal
        open={submitForApprovalModal}
        title={t("t.areYouSure")}
        ariaDescription={t("listings.approval.submitForApprovalDescription")}
        onClose={() => setSubmitForApprovalModal(false)}
        actions={[
          <Button
            id="submitListingForApprovalButtonConfirm"
            type="button"
            variant="success"
            onClick={() => {
              setSubmitForApprovalModal(false)
              triggerSubmitWithStatus(false, ListingsStatusEnum.pendingReview)
            }}
            size="sm"
          >
            {t("t.submit")}
          </Button>,
          <Button
            type="button"
            onClick={() => {
              setSubmitForApprovalModal(false)
            }}
            size="sm"
          >
            {t("t.cancel")}
          </Button>,
        ]}
      >
        {t("listings.approval.submitForApprovalDescription")}
      </Modal>

      <RequestChangesModal
        defaultValue={listing?.requestedChanges}
        modalIsOpen={requestChangesModal}
        setModalIsOpen={setRequestChangesModal}
        submitFormWithStatus={triggerSubmitWithStatus}
      />
    </>
  )
}

export default ListingForm
