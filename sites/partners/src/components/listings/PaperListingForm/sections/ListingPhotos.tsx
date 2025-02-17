import React, { useCallback, useEffect, useMemo, useState } from "react"
import { useFieldArray, useFormContext } from "react-hook-form"
import {
  t,
  Dropzone,
  MinimalTable,
  TableThumbnail,
  StandardTableData,
  StandardTableCell,
  Drawer,
} from "@bloom-housing/ui-components"
import { CLOUDINARY_BUILDING_LABEL, getImageUrlFromAsset } from "@bloom-housing/shared-helpers"
import { fieldHasError } from "../../../../lib/helpers"
import { uploadAssetAndSetData } from "../../../../lib/assets"
import { Button, Grid } from "@bloom-housing/ui-seeds"
import { Asset, ListingImage } from "@bloom-housing/shared-helpers/src/types/backend-swagger"
import SectionWithGrid from "../../../shared/SectionWithGrid"

const ListingPhotos = () => {
  const formMethods = useFormContext()

  // eslint-disable-next-line @typescript-eslint/unbound-method
  const { register, watch, errors, clearErrors } = formMethods

  const { fields, append, remove } = useFieldArray({
    name: "listingImages",
  })
  const listingFormPhotos: ListingImage[] = watch("listingImages").sort((imageA, imageB) => {
    return imageA.ordinal - imageB.ordinal
  })

  const saveImageFields = (images: ListingImage[]) => {
    remove(fields.map((item, index) => index))
    images.forEach((item, index) => {
      append({
        ordinal: index,
        assets: item.assets,
      })
    })
  }

  /*
   Set state for the drawer, upload progress, images in the drawer, and more
   */
  const [drawerState, setDrawerState] = useState(false)
  const [progressValue, setProgressValue] = useState(0)
  const [latestUpload, setLatestUpload] = useState({
    id: "",
    url: "",
  })
  const [drawerImages, setDrawerImages] = useState<ListingImage[]>([])

  const resetDrawerState = () => {
    setDrawerState(false)
    setDrawerImages([])
  }

  const savePhoto = useCallback(() => {
    setDrawerImages([
      ...drawerImages,
      {
        ordinal: drawerImages.length,
        assets: { fileId: latestUpload.id, label: CLOUDINARY_BUILDING_LABEL } as Asset,
      },
    ])
    setLatestUpload({ id: "", url: "" })
    setProgressValue(0)
  }, [drawerImages, latestUpload])

  useEffect(() => {
    if (latestUpload.id != "") {
      savePhoto()
    }
  }, [latestUpload, savePhoto])

  /*
   Show list of images in the main listing form
   */
  const photoTableHeaders = {
    preview: "t.preview",
    primary: "t.primary",
    actions: "",
  }

  const listingPhotoTableRows: StandardTableData = []
  listingFormPhotos.forEach((image, index) => {
    const listingPhotoUrl = getImageUrlFromAsset(image.assets)
    listingPhotoTableRows.push({
      preview: {
        content: (
          <TableThumbnail>
            <img src={listingPhotoUrl} alt="" />
          </TableThumbnail>
        ),
      },
      fileName: { content: image.assets.fileId.split("/").slice(-1).join() },
      primary: {
        content: index == 0 ? t("listings.sections.photo.primaryPhoto") : "",
      },
      actions: {
        content: (
          <Button
            type="button"
            className="text-alert"
            onClick={() => {
              saveImageFields(fields.filter((item, i2) => i2 != index) as ListingImage[])
            }}
            variant="text"
          >
            {t("t.delete")}
          </Button>
        ),
      },
    })
  })

  /*
   Show a re-orderable list of uploaded images within the drawer
   */

  const drawerTableRows: StandardTableData = useMemo(() => {
    return drawerImages.map((item, index) => {
      const image = item.assets
      const imageUrl = getImageUrlFromAsset(image)
      return {
        ordinal: {
          content: item.ordinal + 1,
        },
        preview: {
          content: (
            <TableThumbnail>
              <img src={imageUrl} alt="" />
            </TableThumbnail>
          ),
        },
        fileName: { content: image.fileId.split("/").slice(-1).join() },
        primary: {
          content:
            index == 0 ? (
              t("listings.sections.photo.primaryPhoto")
            ) : (
              <Button
                variant="text"
                className="ml-0"
                onClick={() => {
                  const resortedImages = [
                    drawerImages[index],
                    ...drawerImages.filter((item, i2) => i2 != index),
                  ]
                  resortedImages.forEach((item, i2) => {
                    item.ordinal = i2
                  })
                  setDrawerImages(resortedImages)
                }}
              >
                {t("t.makePrimaryPhoto")}
              </Button>
            ),
        },
        actions: {
          content: (
            <Button
              type="button"
              className="text-alert"
              onClick={() => {
                const filteredImages = drawerImages.filter((item, i2) => i2 != index)
                filteredImages.forEach((item, i2) => {
                  item.ordinal = i2
                })
                setDrawerImages(filteredImages)
              }}
              variant="text"
            >
              {t("t.delete")}
            </Button>
          ),
        },
      }
    })
  }, [drawerImages])

  /*
   Pass the file for the dropzone callback along to the uploader
   */
  const photoUploader = async (file: File) => {
    await uploadAssetAndSetData(file, "building", setProgressValue, setLatestUpload)
  }

  /*
   Register the field array, display the main form table, and set up the drawer
   */
  return (
    <>
      <hr className="spacer-section-above spacer-section" />
      {fields.map((item, index) => (
        <span key={item.id}>
          <input
            type="hidden"
            name={`listingImages[${index}].image.fileId`}
            ref={register()}
            defaultValue={item.assets.fileId}
          />
        </span>
      ))}
      <SectionWithGrid
        heading={t("listings.sections.photoTitle")}
        subheading={t("listings.sections.photoSubtitle")}
      >
        <SectionWithGrid.HeadingRow>{t("listings.sections.photoTitle")}</SectionWithGrid.HeadingRow>
        <Grid.Row columns={1} className="grid-inset-section">
          <Grid.Cell>
            {listingFormPhotos.length > 0 && (
              <div className="mb-5" data-testid="photos-table">
                <MinimalTable
                  headers={photoTableHeaders}
                  data={listingPhotoTableRows}
                ></MinimalTable>
              </div>
            )}

            <Button
              type="button"
              variant={fieldHasError(errors?.listingImages) ? "alert" : "primary-outlined"}
              onClick={() => {
                setDrawerState(true)
                setDrawerImages([...listingFormPhotos])
                clearErrors("listingImages")
              }}
              id="add-photos-button"
            >
              {t(listingFormPhotos.length > 0 ? "listings.editPhotos" : "listings.addPhoto")}
            </Button>
          </Grid.Cell>
        </Grid.Row>
      </SectionWithGrid>
      <p className="field-sub-note">{t("listings.requiredToPublish")}</p>
      {fieldHasError(errors?.listingImages) && (
        <span className={"text-sm text-alert"} id="photos-error">
          {t("errors.requiredFieldError")}
        </span>
      )}

      {/* Image management and upload drawer */}
      <Drawer
        open={drawerState}
        title={t(listingFormPhotos.length > 0 ? "listings.editPhotos" : "listings.addPhoto")}
        onClose={() => resetDrawerState()}
        ariaDescription="Form with photo upload dropzone"
      >
        <section className="border rounded-md p-8 bg-white">
          <h2 className="grid-section__title mb-8">{t("listings.listingPhoto")}</h2>
          {drawerImages.length > 0 && (
            <div className="mb-10" data-testid="drawer-photos-table">
              <span className={"text-tiny text-gray-800 block mb-2"}>{t("t.photos")}</span>
              <MinimalTable
                draggable={true}
                flushLeft={true}
                setData={(newData) => {
                  setDrawerImages(
                    newData.map((item: Record<string, StandardTableCell>, index) => {
                      const foundImage = drawerImages.find(
                        (field) =>
                          field.assets.fileId.split("/").slice(-1).join() == item.fileName.content
                      )
                      return { ...foundImage, ordinal: index }
                    })
                  )
                }}
                headers={photoTableHeaders}
                data={drawerTableRows}
              ></MinimalTable>
            </div>
          )}
          {drawerImages.length < 10 ? (
            <Dropzone
              id="listing-photo-upload"
              label={t("t.uploadFile")}
              helptext={t("listings.sections.photo.helperText")}
              uploader={photoUploader}
              accept="image/*"
              progress={progressValue}
            />
          ) : (
            <p className="field-note text-gray-750">{t("listings.sections.photo.maximumUpload")}</p>
          )}
        </section>
        <Button
          variant="primary"
          type="button"
          className={"mt-4"}
          onClick={() => {
            saveImageFields(drawerImages)
            resetDrawerState()
          }}
          id={drawerImages.length > 0 ? "listing-photo-uploaded" : "listing-photo-empty"}
        >
          {t("t.save")}
        </Button>
      </Drawer>
    </>
  )
}

export default ListingPhotos
