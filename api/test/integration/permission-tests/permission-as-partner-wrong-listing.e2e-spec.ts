import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { stringify } from 'qs';
import {
  FlaggedSetStatusEnum,
  ListingsStatusEnum,
  RuleEnum,
  UnitTypeEnum,
} from '@prisma/client';
import { AppModule } from '../../../src/modules/app.module';
import { PrismaService } from '../../../src/services/prisma.service';
import { userFactory } from '../../../prisma/seed-helpers/user-factory';
import { Login } from '../../../src/dtos/auth/login.dto';
import { listingFactory } from '../../../prisma/seed-helpers/listing-factory';
import { amiChartFactory } from '../../../prisma/seed-helpers/ami-chart-factory';
import { AmiChartQueryParams } from '../../../src/dtos/ami-charts/ami-chart-query-params.dto';
import { IdDTO } from '../../../src/dtos/shared/id.dto';
import {
  unitTypeFactoryAll,
  unitTypeFactorySingle,
} from '../../../prisma/seed-helpers/unit-type-factory';
import { translationFactory } from '../../../prisma/seed-helpers/translation-factory';
import { applicationFactory } from '../../../prisma/seed-helpers/application-factory';
import { addressFactory } from '../../../prisma/seed-helpers/address-factory';
import { AddressCreate } from '../../../src/dtos/addresses/address-create.dto';
import {
  reservedCommunityTypeFactoryAll,
  reservedCommunityTypeFactoryGet,
} from '../../../prisma/seed-helpers/reserved-community-type-factory';
import { unitRentTypeFactory } from '../../../prisma/seed-helpers/unit-rent-type-factory';
import { UnitRentTypeCreate } from '../../../src/dtos/unit-rent-types/unit-rent-type-create.dto';
import { UnitRentTypeUpdate } from '../../../src/dtos/unit-rent-types/unit-rent-type-update.dto';
import {
  unitAccessibilityPriorityTypeFactoryAll,
  unitAccessibilityPriorityTypeFactorySingle,
} from '../../../prisma/seed-helpers/unit-accessibility-priority-type-factory';
import { UnitAccessibilityPriorityTypeCreate } from '../../../src/dtos/unit-accessibility-priority-types/unit-accessibility-priority-type-create.dto';
import { UnitAccessibilityPriorityTypeUpdate } from '../../../src/dtos/unit-accessibility-priority-types/unit-accessibility-priority-type-update.dto';
import { UnitTypeCreate } from '../../../src/dtos/unit-types/unit-type-create.dto';
import { UnitTypeUpdate } from '../../../src/dtos/unit-types/unit-type-update.dto';
import { multiselectQuestionFactory } from '../../../prisma/seed-helpers/multiselect-question-factory';
import { UserUpdate } from '../../../src/dtos/users/user-update.dto';
import { EmailAndAppUrl } from '../../../src/dtos/users/email-and-app-url.dto';
import { ConfirmationRequest } from '../../../src/dtos/users/confirmation-request.dto';
import { UserService } from '../../../src/services/user.service';
import { EmailService } from '../../../src/services/email.service';
import { AfsResolve } from '../../../src/dtos/application-flagged-sets/afs-resolve.dto';
import {
  generateJurisdiction,
  buildAmiChartCreateMock,
  buildAmiChartUpdateMock,
  buildPresignedEndpointMock,
  buildJurisdictionCreateMock,
  buildJurisdictionUpdateMock,
  buildReservedCommunityTypeCreateMock,
  buildReservedCommunityTypeUpdateMock,
  buildMultiselectQuestionCreateMock,
  buildMultiselectQuestionUpdateMock,
  buildUserCreateMock,
  buildUserInviteMock,
  buildApplicationCreateMock,
  buildApplicationUpdateMock,
  constructFullListingData,
  createSimpleApplication,
} from './helpers';
import { ApplicationFlaggedSetService } from '../../../src/services/application-flagged-set.service';

const testEmailService = {
  confirmation: jest.fn(),
  welcome: jest.fn(),
  invitePartnerUser: jest.fn(),
  changeEmail: jest.fn(),
  forgotPassword: jest.fn(),
  sendMfaCode: jest.fn(),
  sendCSV: jest.fn(),
  applicationConfirmation: jest.fn(),
};

describe('Testing Permissioning of endpoints as partner with wrong listing', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let userService: UserService;
  let applicationFlaggedSetService: ApplicationFlaggedSetService;
  let cookies = '';
  let jurisId = '';
  let listingId = '';
  let listingIdToBeDeleted = '';
  let listingMulitselectQuestion = '';
  let listingClosed = '';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(EmailService)
      .useValue(testEmailService)
      .compile();

    app = moduleFixture.createNestApplication();
    prisma = moduleFixture.get<PrismaService>(PrismaService);
    userService = moduleFixture.get<UserService>(UserService);
    applicationFlaggedSetService =
      moduleFixture.get<ApplicationFlaggedSetService>(
        ApplicationFlaggedSetService,
      );

    app.use(cookieParser());
    await app.init();

    jurisId = await generateJurisdiction(prisma, 'permission juris 35');
    await reservedCommunityTypeFactoryAll(jurisId, prisma);
    await unitAccessibilityPriorityTypeFactoryAll(prisma);

    const msq = await prisma.multiselectQuestions.create({
      data: multiselectQuestionFactory(jurisId, {
        multiselectQuestion: {
          text: 'example a',
        },
      }),
    });

    listingMulitselectQuestion = msq.id;

    const listingData = await listingFactory(jurisId, prisma, {
      multiselectQuestions: [msq],
    });
    const listing = await prisma.listings.create({
      data: listingData,
    });
    listingId = listing.id;

    const listingData2 = await listingFactory(jurisId, prisma, {
      multiselectQuestions: [msq],
    });
    const listing2 = await prisma.listings.create({
      data: listingData2,
    });
    listingIdToBeDeleted = listing2.id;

    const listingData3 = await listingFactory(jurisId, prisma, {
      multiselectQuestions: [msq],
    });
    const listing3 = await prisma.listings.create({
      data: listingData3,
    });

    const closedListingData = await listingFactory(jurisId, prisma, {
      multiselectQuestions: [msq],
      status: ListingsStatusEnum.closed,
    });
    const closedListing = await prisma.listings.create({
      data: closedListingData,
    });
    listingClosed = closedListing.id;

    const storedUser = await prisma.userAccounts.create({
      data: await userFactory({
        roles: { isPartner: true },
        listings: [listing3.id],
        jurisdictionIds: [jurisId],
        mfaEnabled: false,
        confirmedAt: new Date(),
      }),
    });
    const resLogIn = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: storedUser.email,
        password: 'abcdef',
      } as Login)
      .expect(201);

    cookies = resLogIn.headers['set-cookie'];
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  describe('Testing ami-chart endpoints', () => {
    it('should succeed for list endpoint', async () => {
      await prisma.amiChart.create({
        data: amiChartFactory(10, jurisId),
      });
      const queryParams: AmiChartQueryParams = {
        jurisdictionId: jurisId,
      };
      const query = stringify(queryParams as any);

      await request(app.getHttpServer())
        .get(`/amiCharts?${query}`)
        .set('Cookie', cookies)
        .expect(200);
    });

    it('should succeed for retrieve endpoint', async () => {
      const amiChartA = await prisma.amiChart.create({
        data: amiChartFactory(10, jurisId),
      });

      await request(app.getHttpServer())
        .get(`/amiCharts/${amiChartA.id}`)
        .set('Cookie', cookies)
        .expect(200);
    });

    it('should error as forbidden for create endpoint', async () => {
      await request(app.getHttpServer())
        .post('/amiCharts')
        .send(buildAmiChartCreateMock(jurisId))
        .set('Cookie', cookies)
        .expect(403);
    });

    it('should error as forbidden for update endpoint', async () => {
      const amiChartA = await prisma.amiChart.create({
        data: amiChartFactory(10, jurisId),
      });

      await request(app.getHttpServer())
        .put(`/amiCharts/${amiChartA.id}`)
        .send(buildAmiChartUpdateMock(amiChartA.id))
        .set('Cookie', cookies)
        .expect(403);
    });

    it('should error as forbidden for delete endpoint', async () => {
      const amiChartA = await prisma.amiChart.create({
        data: amiChartFactory(10, jurisId),
      });

      await request(app.getHttpServer())
        .delete(`/amiCharts`)
        .send({
          id: amiChartA.id,
        } as IdDTO)
        .set('Cookie', cookies)
        .expect(403);
    });
  });

  describe('Testing app endpoints', () => {
    it('should succeed for heartbeat endpoint', async () => {
      request(app.getHttpServer()).get('/').expect(200);
    });
  });

  describe('Testing application endpoints', () => {
    beforeAll(async () => {
      await unitTypeFactoryAll(prisma);
      await await prisma.translations.create({
        data: translationFactory(),
      });
    });

    it('should succeed for list endpoint', async () => {
      await request(app.getHttpServer())
        .get(`/applications?`)
        .set('Cookie', cookies)
        .expect(200);
    });

    it('should succeed for retrieve endpoint', async () => {
      const unitTypeA = await unitTypeFactorySingle(
        prisma,
        UnitTypeEnum.oneBdrm,
      );

      const applicationA = await prisma.applications.create({
        data: await applicationFactory({ unitTypeId: unitTypeA.id }),
        include: {
          applicant: true,
        },
      });

      await request(app.getHttpServer())
        .get(`/applications/${applicationA.id}`)
        .set('Cookie', cookies)
        .expect(200);
    });

    it('should error as forbidden for delete endpoint', async () => {
      const unitTypeA = await unitTypeFactorySingle(
        prisma,
        UnitTypeEnum.oneBdrm,
      );
      const applicationA = await prisma.applications.create({
        data: await applicationFactory({
          unitTypeId: unitTypeA.id,
          listingId: listingId,
        }),
        include: {
          applicant: true,
        },
      });

      await request(app.getHttpServer())
        .delete(`/applications/`)
        .send({
          id: applicationA.id,
        })
        .set('Cookie', cookies)
        .expect(403);
    });

    it('should succeed for public create endpoint', async () => {
      const unitTypeA = await unitTypeFactorySingle(
        prisma,
        UnitTypeEnum.oneBdrm,
      );

      const exampleAddress = addressFactory() as AddressCreate;
      await request(app.getHttpServer())
        .post(`/applications/submit`)
        .send(
          buildApplicationCreateMock(
            exampleAddress,
            listingId,
            unitTypeA.id,
            new Date(),
          ),
        )
        .set('Cookie', cookies)
        .expect(201);
    });

    it('should error as forbidden for partner create endpoint', async () => {
      const unitTypeA = await unitTypeFactorySingle(
        prisma,
        UnitTypeEnum.oneBdrm,
      );

      const exampleAddress = addressFactory() as AddressCreate;
      await request(app.getHttpServer())
        .post(`/applications/`)
        .send(
          buildApplicationCreateMock(
            exampleAddress,
            listingId,
            unitTypeA.id,
            new Date(),
          ),
        )
        .set('Cookie', cookies)
        .expect(403);
    });

    it('should error as forbidden for update endpoint', async () => {
      const unitTypeA = await unitTypeFactorySingle(
        prisma,
        UnitTypeEnum.oneBdrm,
      );

      const applicationA = await prisma.applications.create({
        data: await applicationFactory({
          unitTypeId: unitTypeA.id,
          listingId: listingId,
        }),
        include: {
          applicant: true,
        },
      });

      const exampleAddress = addressFactory() as AddressCreate;
      await request(app.getHttpServer())
        .put(`/applications/${applicationA.id}`)
        .send(
          buildApplicationUpdateMock(
            applicationA.id,
            exampleAddress,
            listingId,
            unitTypeA.id,
            new Date(),
          ),
        )
        .set('Cookie', cookies)
        .expect(403);
    });

    it('should succeed for verify endpoint', async () => {
      const unitTypeA = await unitTypeFactorySingle(
        prisma,
        UnitTypeEnum.oneBdrm,
      );

      const exampleAddress = addressFactory() as AddressCreate;

      await request(app.getHttpServer())
        .post(`/applications/verify`)
        .send(
          buildApplicationCreateMock(
            exampleAddress,
            listingId,
            unitTypeA.id,
            new Date(),
          ),
        )
        .set('Cookie', cookies)
        .expect(201);
    });

    it('should error as forbidden for csv endpoint', async () => {
      const jurisdiction = await generateJurisdiction(
        prisma,
        'permission juris csv endpoint wrong listing',
      );
      await reservedCommunityTypeFactoryAll(jurisdiction, prisma);
      const application = await applicationFactory();
      const listing1 = await listingFactory(jurisdiction, prisma, {
        applications: [application],
      });
      const listing1Created = await prisma.listings.create({
        data: listing1,
      });
      await request(app.getHttpServer())
        .get(`/applications/csv?listingId=${listing1Created.id}`)
        .set('Cookie', cookies)
        .expect(403);
    });
  });

  describe('Testing asset endpoints', () => {
    it('should succeed for presigned endpoint', async () => {
      await request(app.getHttpServer())
        .post('/asset/presigned-upload-metadata/')
        .send(buildPresignedEndpointMock())
        .set('Cookie', cookies)
        .expect(201);
    });
  });

  describe('Testing jurisdiction endpoints', () => {
    it('should succeed for list endpoint', async () => {
      await request(app.getHttpServer())
        .get(`/jurisdictions?`)
        .set('Cookie', cookies)
        .expect(200);
    });

    it('should succeed for retrieve endpoint', async () => {
      await request(app.getHttpServer())
        .get(`/jurisdictions/${jurisId}`)
        .set('Cookie', cookies)
        .expect(200);
    });

    it('should succeed for retrieve by name endpoint', async () => {
      const jurisdictionA = await prisma.jurisdictions.findFirst({
        where: {
          id: jurisId,
        },
      });

      await request(app.getHttpServer())
        .get(`/jurisdictions/byName/${jurisdictionA.name}`)
        .set('Cookie', cookies)
        .expect(200);
    });

    it('should error as forbidden for create endpoint', async () => {
      await request(app.getHttpServer())
        .post('/jurisdictions')
        .send(buildJurisdictionCreateMock('new permission jurisdiction 5'))
        .set('Cookie', cookies)
        .expect(403);
    });

    it('should error as forbidden for update endpoint', async () => {
      await request(app.getHttpServer())
        .put(`/jurisdictions/${jurisId}`)
        .send(buildJurisdictionUpdateMock(jurisId, 'permission juris 9:6'))
        .set('Cookie', cookies)
        .expect(403);
    });

    it('should error as forbidden for delete endpoint', async () => {
      const jurisdictionA = await generateJurisdiction(
        prisma,
        'permission juris 36',
      );

      await request(app.getHttpServer())
        .delete(`/jurisdictions`)
        .send({
          id: jurisdictionA,
        } as IdDTO)
        .set('Cookie', cookies)
        .expect(403);
    });
  });

  describe('Testing reserved community types endpoints', () => {
    it('should succeed for list endpoint', async () => {
      await request(app.getHttpServer())
        .get(`/reservedCommunityTypes`)
        .set('Cookie', cookies)
        .expect(200);
    });

    it('should succeed for retrieve endpoint', async () => {
      const reservedCommunityTypeA = await reservedCommunityTypeFactoryGet(
        prisma,
        jurisId,
      );

      await request(app.getHttpServer())
        .get(`/reservedCommunityTypes/${reservedCommunityTypeA.id}`)
        .set('Cookie', cookies)
        .expect(200);
    });

    it('should error as forbidden for create endpoint', async () => {
      await request(app.getHttpServer())
        .post('/reservedCommunityTypes')
        .send(buildReservedCommunityTypeCreateMock(jurisId))
        .set('Cookie', cookies)
        .expect(403);
    });

    it('should error as forbidden for update endpoint', async () => {
      const reservedCommunityTypeA = await reservedCommunityTypeFactoryGet(
        prisma,
        jurisId,
      );

      await request(app.getHttpServer())
        .put(`/reservedCommunityTypes/${reservedCommunityTypeA.id}`)
        .send(buildReservedCommunityTypeUpdateMock(reservedCommunityTypeA.id))
        .set('Cookie', cookies)
        .expect(403);
    });

    it('should error as forbidden for delete endpoint', async () => {
      const reservedCommunityTypeA = await reservedCommunityTypeFactoryGet(
        prisma,
        jurisId,
      );

      await request(app.getHttpServer())
        .delete(`/reservedCommunityTypes`)
        .send({
          id: reservedCommunityTypeA.id,
        } as IdDTO)
        .set('Cookie', cookies)
        .expect(403);
    });
  });

  describe('Testing unit rent types endpoints', () => {
    it('should succeed for list endpoint', async () => {
      await request(app.getHttpServer())
        .get(`/unitRentTypes?`)
        .set('Cookie', cookies)
        .expect(200);
    });

    it('should succeed for retrieve endpoint', async () => {
      const unitRentTypeA = await prisma.unitRentTypes.create({
        data: unitRentTypeFactory(),
      });

      await request(app.getHttpServer())
        .get(`/unitRentTypes/${unitRentTypeA.id}`)
        .set('Cookie', cookies)
        .expect(200);
    });

    it('should error as forbidden for create endpoint', async () => {
      const name = unitRentTypeFactory().name;
      await request(app.getHttpServer())
        .post('/unitRentTypes')
        .send({
          name: name,
        } as UnitRentTypeCreate)
        .set('Cookie', cookies)
        .expect(403);
    });

    it('should error as forbidden for update endpoint', async () => {
      const unitRentTypeA = await prisma.unitRentTypes.create({
        data: unitRentTypeFactory(),
      });
      const name = unitRentTypeFactory().name;
      await request(app.getHttpServer())
        .put(`/unitRentTypes/${unitRentTypeA.id}`)
        .send({
          id: unitRentTypeA.id,
          name: name,
        } as UnitRentTypeUpdate)
        .set('Cookie', cookies)
        .expect(403);
    });

    it('should error as forbidden for delete endpoint', async () => {
      const unitRentTypeA = await prisma.unitRentTypes.create({
        data: unitRentTypeFactory(),
      });

      await request(app.getHttpServer())
        .delete(`/unitRentTypes`)
        .send({
          id: unitRentTypeA.id,
        } as IdDTO)
        .set('Cookie', cookies)
        .expect(403);
    });
  });

  describe('Testing unit accessibility priority types endpoints', () => {
    it('should succeed for list endpoint', async () => {
      await request(app.getHttpServer())
        .get(`/unitAccessibilityPriorityTypes?`)
        .set('Cookie', cookies)
        .expect(200);
    });

    it('should succeed for retrieve endpoint', async () => {
      const unitTypeA = await unitAccessibilityPriorityTypeFactorySingle(
        prisma,
      );

      await request(app.getHttpServer())
        .get(`/unitAccessibilityPriorityTypes/${unitTypeA.id}`)
        .set('Cookie', cookies)
        .expect(200);
    });

    it('should error as forbidden for create endpoint', async () => {
      await request(app.getHttpServer())
        .post('/unitAccessibilityPriorityTypes')
        .send({
          name: 'hearing',
        } as UnitAccessibilityPriorityTypeCreate)
        .set('Cookie', cookies)
        .expect(403);
    });

    it('should error as forbidden for update endpoint', async () => {
      const unitTypeA = await unitAccessibilityPriorityTypeFactorySingle(
        prisma,
      );
      await request(app.getHttpServer())
        .put(`/unitAccessibilityPriorityTypes/${unitTypeA.id}`)
        .send({
          id: unitTypeA.id,
          name: 'hearing',
        } as UnitAccessibilityPriorityTypeUpdate)
        .set('Cookie', cookies)
        .expect(403);
    });

    it('should error as forbidden for delete endpoint', async () => {
      const unitTypeA = await unitAccessibilityPriorityTypeFactorySingle(
        prisma,
      );

      await request(app.getHttpServer())
        .delete(`/unitAccessibilityPriorityTypes`)
        .send({
          id: unitTypeA.id,
        } as IdDTO)
        .set('Cookie', cookies)
        .expect(403);
    });
  });

  describe('Testing unit types endpoints', () => {
    it('should succeed for list endpoint', async () => {
      await request(app.getHttpServer())
        .get(`/unitTypes?`)
        .set('Cookie', cookies)
        .expect(200);
    });

    it('should succeed for retrieve endpoint', async () => {
      const unitTypeA = await unitTypeFactorySingle(
        prisma,
        UnitTypeEnum.oneBdrm,
      );

      await request(app.getHttpServer())
        .get(`/unitTypes/${unitTypeA.id}`)
        .set('Cookie', cookies)
        .expect(200);
    });

    it('should error as forbidden for create endpoint', async () => {
      const name = UnitTypeEnum.twoBdrm;
      await request(app.getHttpServer())
        .post('/unitTypes')
        .send({
          name: name,
          numBedrooms: 10,
        } as UnitTypeCreate)
        .set('Cookie', cookies)
        .expect(403);
    });

    it('should error as forbidden for update endpoint', async () => {
      const unitTypeA = await unitTypeFactorySingle(prisma, UnitTypeEnum.SRO);
      const name = UnitTypeEnum.SRO;
      await request(app.getHttpServer())
        .put(`/unitTypes/${unitTypeA.id}`)
        .send({
          id: unitTypeA.id,
          name: name,
          numBedrooms: 11,
        } as UnitTypeUpdate)
        .set('Cookie', cookies)
        .expect(403);
    });

    it('should error as forbidden for delete endpoint', async () => {
      const unitTypeA = await unitTypeFactorySingle(
        prisma,
        UnitTypeEnum.oneBdrm,
      );

      await request(app.getHttpServer())
        .delete(`/unitTypes`)
        .send({
          id: unitTypeA.id,
        } as IdDTO)
        .set('Cookie', cookies)
        .expect(403);
    });
  });

  describe('Testing multiselect questions endpoints', () => {
    it('should succeed for list endpoint', async () => {
      await request(app.getHttpServer())
        .get(`/multiselectQuestions?`)
        .set('Cookie', cookies)
        .expect(200);
    });

    it('should succeed for retrieve endpoint', async () => {
      const multiselectQuestionA = await prisma.multiselectQuestions.create({
        data: multiselectQuestionFactory(jurisId),
      });

      await request(app.getHttpServer())
        .get(`/multiselectQuestions/${multiselectQuestionA.id}`)
        .set('Cookie', cookies)
        .expect(200);
    });

    it('should error as forbidden for create endpoint', async () => {
      await request(app.getHttpServer())
        .post('/multiselectQuestions')
        .send(buildMultiselectQuestionCreateMock(jurisId))
        .set('Cookie', cookies)
        .expect(403);
    });

    it('should error as forbidden for update endpoint', async () => {
      const multiselectQuestionA = await prisma.multiselectQuestions.create({
        data: multiselectQuestionFactory(jurisId),
      });

      await request(app.getHttpServer())
        .put(`/multiselectQuestions/${multiselectQuestionA.id}`)
        .send(
          buildMultiselectQuestionUpdateMock(jurisId, multiselectQuestionA.id),
        )
        .set('Cookie', cookies)
        .expect(403);
    });

    it('should error as forbidden for delete endpoint', async () => {
      const multiselectQuestionA = await prisma.multiselectQuestions.create({
        data: multiselectQuestionFactory(jurisId),
      });

      await request(app.getHttpServer())
        .delete(`/multiselectQuestions`)
        .send({
          id: multiselectQuestionA.id,
        } as IdDTO)
        .set('Cookie', cookies)
        .expect(403);
    });
  });

  describe('Testing user endpoints', () => {
    it('should error as forbidden for list endpoint', async () => {
      await request(app.getHttpServer())
        .get(`/user/list?`)
        .set('Cookie', cookies)
        .expect(403);
    });

    it('should error as forbidden for retrieve endpoint', async () => {
      const userA = await prisma.userAccounts.create({
        data: await userFactory(),
      });

      await request(app.getHttpServer())
        .get(`/user/${userA.id}`)
        .set('Cookie', cookies)
        .expect(403);
    });

    it('should error as forbidden for update endpoint', async () => {
      const userA = await prisma.userAccounts.create({
        data: await userFactory(),
      });

      await request(app.getHttpServer())
        .put(`/user/${userA.id}`)
        .send({
          id: userA.id,
          firstName: 'New User First Name',
          lastName: 'New User Last Name',
        } as UserUpdate)
        .set('Cookie', cookies)
        .expect(403);
    });

    it('should error as forbidden for delete endpoint', async () => {
      const userA = await prisma.userAccounts.create({
        data: await userFactory(),
      });

      await request(app.getHttpServer())
        .delete(`/user/`)
        .send({
          id: userA.id,
        } as IdDTO)
        .set('Cookie', cookies)
        .expect(403);
    });

    it('should succeed for public resend confirmation endpoint', async () => {
      const userA = await prisma.userAccounts.create({
        data: await userFactory(),
      });

      await request(app.getHttpServer())
        .post(`/user/resend-confirmation/`)
        .send({
          email: userA.email,
          appUrl: 'https://www.google.com',
        } as EmailAndAppUrl)
        .set('Cookie', cookies)
        .expect(201);
    });

    it('should succeed for partner resend confirmation endpoint', async () => {
      const userA = await prisma.userAccounts.create({
        data: await userFactory(),
      });
      await request(app.getHttpServer())
        .post(`/user/resend-partner-confirmation/`)
        .send({
          email: userA.email,
          appUrl: 'https://www.google.com',
        } as EmailAndAppUrl)
        .set('Cookie', cookies)
        .expect(201);
    });

    it('should succeed for verify token endpoint', async () => {
      const userA = await prisma.userAccounts.create({
        data: await userFactory(),
      });

      const confToken = await userService.createConfirmationToken(
        userA.id,
        userA.email,
      );
      await prisma.userAccounts.update({
        where: {
          id: userA.id,
        },
        data: {
          confirmationToken: confToken,
          confirmedAt: null,
        },
      });
      await request(app.getHttpServer())
        .post(`/user/is-confirmation-token-valid/`)
        .send({
          token: confToken,
        } as ConfirmationRequest)
        .set('Cookie', cookies)
        .expect(201);
    });

    it('should succeed for resetToken endpoint', async () => {
      const userA = await prisma.userAccounts.create({
        data: await userFactory(),
      });
      await request(app.getHttpServer())
        .put(`/user/forgot-password/`)
        .send({
          email: userA.email,
        } as EmailAndAppUrl)
        .set('Cookie', cookies)
        .expect(200);
    });

    it('should succeed for public create endpoint', async () => {
      const juris = await generateJurisdiction(prisma, 'permission juris 37');

      const data = await applicationFactory();
      data.applicant.create.emailAddress = 'publicuser@email.com';
      await prisma.applications.create({
        data,
      });

      await request(app.getHttpServer())
        .post(`/user/`)
        .send(buildUserCreateMock(juris, 'publicUser+partnerWrong@email.com'))
        .set('Cookie', cookies)
        .expect(201);
    });

    it('should error as forbidden for partner create endpoint', async () => {
      const juris = await generateJurisdiction(prisma, 'permission juris 38');

      await request(app.getHttpServer())
        .post(`/user/invite`)
        .send(buildUserInviteMock(juris, 'partnerUser+partnerWrong@email.com'))
        .set('Cookie', cookies)
        .expect(403);
    });

    it('should error as forbidden for csv export endpoint', async () => {
      await request(app.getHttpServer())
        .get('/user/csv')
        .set('Cookie', cookies)
        .expect(403);
    });
  });

  describe('Testing listing endpoints', () => {
    it('should succeed for list endpoint', async () => {
      await request(app.getHttpServer())
        .get(`/listings?`)
        .set('Cookie', cookies)
        .expect(200);
    });

    it('should succeed for retrieveListings endpoint', async () => {
      await request(app.getHttpServer())
        .get(`/listings/byMultiselectQuestion/${listingMulitselectQuestion}`)
        .set('Cookie', cookies)
        .expect(200);
    });

    it('should succeed for external listing endpoint', async () => {
      await request(app.getHttpServer())
        .get(`/listings/external/${listingId}`)
        .set('Cookie', cookies)
        .expect(200);
    });

    it('should error as forbidden for delete endpoint', async () => {
      await request(app.getHttpServer())
        .delete(`/listings/`)
        .send({
          id: listingIdToBeDeleted,
        } as IdDTO)
        .set('Cookie', cookies)
        .expect(403);
    });

    it('should error as forbidden for update endpoint', async () => {
      const val = await constructFullListingData(prisma, listingId, jurisId);

      await request(app.getHttpServer())
        .put(`/listings/${listingId}`)
        .send(val)
        .set('Cookie', cookies)
        .expect(403);
    });

    it('should error as forbidden for create endpoint', async () => {
      const val = await constructFullListingData(prisma, undefined, jurisId);

      await request(app.getHttpServer())
        .post('/listings')
        .send(val)
        .set('Cookie', cookies)
        .expect(403);
    });

    it('should error as forbidden for process endpoint', async () => {
      await request(app.getHttpServer())
        .put(`/listings/process`)
        .set('Cookie', cookies)
        .expect(403);
    });

    it('should succeed for csv endpoint', async () => {
      await request(app.getHttpServer())
        .get(`/listings/csv`)
        .set('Cookie', cookies)
        .expect(200);
    });
  });

  describe('Testing application flagged set endpoints', () => {
    it('should succeed for list endpoint', async () => {
      await request(app.getHttpServer())
        .get(`/applicationFlaggedSets?`)
        .set('Cookie', cookies)
        .expect(200);
    });

    it('should succeed for meta endpoint', async () => {
      await request(app.getHttpServer())
        .get(`/applicationFlaggedSets/meta?`)
        .set('Cookie', cookies)
        .expect(200);
    });

    it('should succeed for retrieve endpoint', async () => {
      const applicationA = await createSimpleApplication(prisma);
      const applicationB = await createSimpleApplication(prisma);

      const resolvedAFS = await prisma.applicationFlaggedSet.create({
        data: {
          rule: RuleEnum.email,
          ruleKey: `example rule key ${listingId}`,
          showConfirmationAlert: false,
          status: FlaggedSetStatusEnum.resolved,
          listings: {
            connect: {
              id: listingId,
            },
          },
          applications: {
            connect: [{ id: applicationA }, { id: applicationB }],
          },
        },
      });

      await request(app.getHttpServer())
        .get(`/applicationFlaggedSets/${resolvedAFS.id}`)
        .set('Cookie', cookies)
        .expect(200);
    });

    it('should succeed for resolve endpoint', async () => {
      const applicationA = await createSimpleApplication(prisma);
      const applicationB = await createSimpleApplication(prisma);

      const afs = await prisma.applicationFlaggedSet.create({
        data: {
          rule: RuleEnum.email,
          ruleKey: `example rule key ${listingId} resolve`,
          showConfirmationAlert: false,
          status: FlaggedSetStatusEnum.pending,
          listings: {
            connect: {
              id: listingClosed,
            },
          },
          applications: {
            connect: [{ id: applicationA }, { id: applicationB }],
          },
        },
      });

      await request(app.getHttpServer())
        .post(`/applicationFlaggedSets/resolve`)
        .send({
          afsId: afs.id,
          status: FlaggedSetStatusEnum.resolved,
          applications: [
            {
              id: applicationA,
            },
          ],
        } as AfsResolve)
        .set('Cookie', cookies)
        .expect(201);
    });

    it('should succeed for reset confirmation endpoint', async () => {
      const applicationA = await createSimpleApplication(prisma);
      const applicationB = await createSimpleApplication(prisma);

      const afs = await prisma.applicationFlaggedSet.create({
        data: {
          rule: RuleEnum.email,
          ruleKey: `example rule key ${listingId} reset`,
          showConfirmationAlert: true,
          status: FlaggedSetStatusEnum.resolved,
          listings: {
            connect: {
              id: listingId,
            },
          },
          applications: {
            connect: [{ id: applicationA }, { id: applicationB }],
          },
        },
      });

      await request(app.getHttpServer())
        .put(`/applicationFlaggedSets/${afs.id}`)
        .send({
          id: afs.id,
        } as IdDTO)
        .set('Cookie', cookies)
        .expect(200);
    });

    it('should succeed for process endpoint', async () => {
      /*
        Because so many different iterations of the process endpoint were firing we were running into collisions. 
        Since this is just testing the permissioning aspect I'm switching to mocking the process function
      */
      applicationFlaggedSetService.process = jest.fn();

      await request(app.getHttpServer())
        .put(`/applicationFlaggedSets/process`)
        .set('Cookie', cookies)
        .expect(200);
    });
  });
});
