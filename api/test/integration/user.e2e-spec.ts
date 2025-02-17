import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { stringify } from 'qs';
import request from 'supertest';
import { AppModule } from '../../src/modules/app.module';
import { PrismaService } from '../../src/services/prisma.service';
import { userFactory } from '../../prisma/seed-helpers/user-factory';
import cookieParser from 'cookie-parser';
import { UserQueryParams } from '../../src/dtos/users/user-query-param.dto';
import { UserUpdate } from '../../src/dtos/users/user-update.dto';
import { IdDTO } from '../../src/dtos/shared/id.dto';
import { EmailAndAppUrl } from '../../src/dtos/users/email-and-app-url.dto';
import { ConfirmationRequest } from '../../src/dtos/users/confirmation-request.dto';
import { UserService } from '../../src/services/user.service';
import { UserCreate } from '../../src/dtos/users/user-create.dto';
import { jurisdictionFactory } from '../../prisma/seed-helpers/jurisdiction-factory';
import { applicationFactory } from '../../prisma/seed-helpers/application-factory';
import { UserInvite } from '../../src/dtos/users/user-invite.dto';
import { EmailService } from '../../src/services/email.service';
import { Login } from '../../src/dtos/auth/login.dto';

describe('User Controller Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let userService: UserService;
  let cookies = '';

  const invitePartnerUserMock = jest.fn();
  const testEmailService = {
    confirmation: jest.fn(),
    welcome: jest.fn(),
    invitePartnerUser: invitePartnerUserMock,
    changeEmail: jest.fn(),
    forgotPassword: jest.fn(),
    sendMfaCode: jest.fn(),
    sendCSV: jest.fn(),
  };

  beforeEach(() => {
    jest.resetAllMocks();
  });

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(EmailService)
      .useValue(testEmailService)
      .compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    prisma = moduleFixture.get<PrismaService>(PrismaService);
    userService = moduleFixture.get<UserService>(UserService);
    await app.init();

    const storedUser = await prisma.userAccounts.create({
      data: await userFactory({
        roles: { isAdmin: true },
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

  // without clearing the db between tests or test suites this is flakes because of other e2e tests
  it.skip('should get no users from list() when no params and no data', async () => {
    const res = await request(app.getHttpServer())
      .get(`/user/list?`)
      .expect(200);
    expect(res.body.items.length).toEqual(0);
  });

  it('should get users from list() when no params', async () => {
    await prisma.userAccounts.create({
      data: await userFactory(),
    });
    await prisma.userAccounts.create({
      data: await userFactory(),
    });

    const res = await request(app.getHttpServer())
      .get(`/user/list?`)
      .set('Cookie', cookies)
      .expect(200);
    expect(res.body.items.length).toBeGreaterThanOrEqual(2);
  });

  it('should get users from list() when params sent', async () => {
    const userA = await prisma.userAccounts.create({
      data: await userFactory({
        roles: { isPartner: true },
        firstName: '1110',
      }),
    });
    const userB = await prisma.userAccounts.create({
      data: await userFactory({
        roles: { isPartner: true },
        firstName: '1111',
      }),
    });

    const queryParams: UserQueryParams = {
      limit: 2,
      page: 1,
      filter: [
        {
          isPortalUser: true,
        },
      ],
      search: '111',
    };
    const query = stringify(queryParams as any);

    const res = await request(app.getHttpServer())
      .get(`/user/list?${query}`)
      .set('Cookie', cookies)
      .expect(200);
    expect(res.body.items.length).toBeGreaterThanOrEqual(2);
    const ids = res.body.items.map((item) => item.id);
    expect(ids).toContain(userA.id);
    expect(ids).toContain(userB.id);
  });

  it("should error when retrieve() called with id that doesn't exist", async () => {
    const id = randomUUID();
    const res = await request(app.getHttpServer())
      .get(`/user/${id}`)
      .set('Cookie', cookies)
      .expect(404);
    expect(res.body.message).toEqual(
      `user id: ${id} was requested but not found`,
    );
  });

  it('should get user from retrieve()', async () => {
    const userA = await prisma.userAccounts.create({
      data: await userFactory(),
    });

    const res = await request(app.getHttpServer())
      .get(`/user/${userA.id}`)
      .set('Cookie', cookies)
      .expect(200);

    expect(res.body.id).toEqual(userA.id);
  });

  it('should update user when user exists', async () => {
    const userA = await prisma.userAccounts.create({
      data: await userFactory(),
    });

    const res = await request(app.getHttpServer())
      .put(`/user/${userA.id}`)
      .send({
        id: userA.id,
        firstName: 'New User First Name',
        lastName: 'New User Last Name',
      } as UserUpdate)
      .set('Cookie', cookies)
      .expect(200);

    expect(res.body.id).toEqual(userA.id);
    expect(res.body.firstName).toEqual('New User First Name');
    expect(res.body.lastName).toEqual('New User Last Name');
  });

  it("should error when updating user that doesn't exist", async () => {
    await prisma.userAccounts.create({
      data: await userFactory(),
    });
    const randomId = randomUUID();
    const res = await request(app.getHttpServer())
      .put(`/user/${randomId}`)
      .send({
        id: randomId,
        firstName: 'New User First Name',
        lastName: 'New User Last Name',
      } as UserUpdate)
      .set('Cookie', cookies)
      .expect(404);

    expect(res.body.message).toEqual(
      `user id: ${randomId} was requested but not found`,
    );
  });

  it('should delete user when user exists', async () => {
    const userA = await prisma.userAccounts.create({
      data: await userFactory({ roles: { isPartner: true } }),
    });

    const res = await request(app.getHttpServer())
      .delete(`/user/`)
      .send({
        id: userA.id,
      } as IdDTO)
      .set('Cookie', cookies)
      .expect(200);

    expect(res.body.success).toEqual(true);
  });

  it("should error when deleting user that doesn't exist", async () => {
    const randomId = randomUUID();
    const res = await request(app.getHttpServer())
      .delete(`/user/`)
      .send({
        id: randomId,
      } as IdDTO)
      .set('Cookie', cookies)
      .expect(404);

    expect(res.body.message).toEqual(
      `user id: ${randomId} was requested but not found`,
    );
  });

  it('should resend confirmation for public when user exists', async () => {
    const userA = await prisma.userAccounts.create({
      data: await userFactory(),
    });

    const res = await request(app.getHttpServer())
      .post(`/user/resend-confirmation/`)
      .send({
        email: userA.email,
        appUrl: 'https://www.google.com',
      } as EmailAndAppUrl)
      .set('Cookie', cookies)
      .expect(201);

    expect(res.body.success).toEqual(true);
    const mockWelcome = jest.spyOn(testEmailService, 'welcome');
    const userPostResend = await prisma.userAccounts.findUnique({
      where: {
        id: userA.id,
      },
    });

    expect(userPostResend.email).toBe(userA.email);
    expect(userPostResend.confirmationToken).not.toBeNull();
    expect(mockWelcome.mock.calls.length).toBe(1);
  });

  it('should succeed when trying to resend confirmation but not update record when user is already confirmed', async () => {
    const userA = await prisma.userAccounts.create({
      data: {
        ...(await userFactory()),
        confirmedAt: new Date(),
      },
    });

    const mockWelcome = jest.spyOn(testEmailService, 'welcome');
    const res = await request(app.getHttpServer())
      .post(`/user/resend-confirmation/`)
      .send({
        email: userA.email,
        appUrl: 'https://www.google.com',
      } as EmailAndAppUrl)
      .set('Cookie', cookies)
      .expect(201);

    expect(res.body.success).toEqual(true);

    const userPostResend = await prisma.userAccounts.findUnique({
      where: {
        id: userA.id,
      },
    });

    expect(userPostResend.email).toBe(userA.email);
    expect(userPostResend.confirmationToken).toBeNull();
    expect(mockWelcome.mock.calls.length).toBe(0);
  });

  it('should error trying to resend confirmation but no user exists', async () => {
    const email = 'test@nonexistent.com';
    const mockWelcome = jest.spyOn(testEmailService, 'welcome');
    const res = await request(app.getHttpServer())
      .post(`/user/resend-confirmation/`)
      .send({
        email: email,
        appUrl: 'https://www.google.com',
      } as EmailAndAppUrl)
      .set('Cookie', cookies)
      .expect(404);

    expect(res.body.message).toEqual(
      `user email: ${email} was requested but not found`,
    );
    expect(mockWelcome.mock.calls.length).toBe(0);
  });

  it('should resend partner confirmation when user exists', async () => {
    const userA = await prisma.userAccounts.create({
      data: await userFactory(),
    });
    const mockinvitePartnerUser = jest.spyOn(
      testEmailService,
      'invitePartnerUser',
    );
    const res = await request(app.getHttpServer())
      .post(`/user/resend-partner-confirmation/`)
      .send({
        email: userA.email,
        appUrl: 'https://www.google.com',
      } as EmailAndAppUrl)
      .set('Cookie', cookies)
      .expect(201);

    expect(res.body.success).toEqual(true);

    const userPostResend = await prisma.userAccounts.findUnique({
      where: {
        id: userA.id,
      },
    });

    expect(userPostResend.email).toBe(userA.email);
    expect(userPostResend.confirmationToken).not.toBeNull();
    expect(mockinvitePartnerUser.mock.calls.length).toBe(1);
  });

  it('should succeed when trying to resend partner confirmation but not update record when user is already confirmed', async () => {
    const mockinvitePartnerUser = jest.spyOn(
      testEmailService,
      'invitePartnerUser',
    );
    const userA = await prisma.userAccounts.create({
      data: {
        ...(await userFactory()),
        confirmedAt: new Date(),
      },
    });

    const res = await request(app.getHttpServer())
      .post(`/user/resend-partner-confirmation/`)
      .send({
        email: userA.email,
        appUrl: 'https://www.google.com',
      } as EmailAndAppUrl)
      .set('Cookie', cookies)
      .expect(201);

    expect(res.body.success).toEqual(true);

    const userPostResend = await prisma.userAccounts.findUnique({
      where: {
        id: userA.id,
      },
    });

    expect(userPostResend.email).toBe(userA.email);
    expect(userPostResend.confirmationToken).toBeNull();
    expect(mockinvitePartnerUser.mock.calls.length).toBe(0);
  });

  it('should error trying to resend partner confirmation but no user exists', async () => {
    const email = 'test@nonexistent.com';
    const res = await request(app.getHttpServer())
      .post(`/user/resend-partner-confirmation/`)
      .send({
        email: email,
        appUrl: 'https://www.google.com',
      } as EmailAndAppUrl)
      .set('Cookie', cookies)
      .expect(404);

    expect(res.body.message).toEqual(
      `user email: ${email} was requested but not found`,
    );
  });

  it('should verify token as valid', async () => {
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
    const res = await request(app.getHttpServer())
      .post(`/user/is-confirmation-token-valid/`)
      .send({
        token: confToken,
      } as ConfirmationRequest)
      .set('Cookie', cookies)
      .expect(201);

    expect(res.body.success).toEqual(true);

    const userPostResend = await prisma.userAccounts.findUnique({
      where: {
        id: userA.id,
      },
    });

    expect(userPostResend.hitConfirmationUrl).not.toBeNull();
    expect(userPostResend.confirmationToken).toEqual(confToken);
  });

  it('should fail to verify token when incorrect user id is provided', async () => {
    const userA = await prisma.userAccounts.create({
      data: await userFactory(),
    });

    const storedConfToken = await userService.createConfirmationToken(
      userA.id,
      userA.email,
    );
    await prisma.userAccounts.update({
      where: {
        id: userA.id,
      },
      data: {
        confirmationToken: storedConfToken,
        confirmedAt: null,
      },
    });

    const fakeConfToken = await userService.createConfirmationToken(
      randomUUID(),
      userA.email,
    );
    const res = await request(app.getHttpServer())
      .post(`/user/is-confirmation-token-valid/`)
      .send({
        token: fakeConfToken,
      } as ConfirmationRequest)
      .set('Cookie', cookies)
      .expect(201);

    expect(res.body.success).toBe(undefined);

    const userPostResend = await prisma.userAccounts.findUnique({
      where: {
        id: userA.id,
      },
    });

    expect(userPostResend.hitConfirmationUrl).toBeNull();
  });

  it('should fail to verify token when token mismatch', async () => {
    const userA = await prisma.userAccounts.create({
      data: await userFactory(),
    });

    const storedConfToken = await userService.createConfirmationToken(
      userA.id,
      userA.email,
    );
    await prisma.userAccounts.update({
      where: {
        id: userA.id,
      },
      data: {
        confirmationToken: storedConfToken,
        confirmedAt: null,
      },
    });

    const fakeConfToken = await userService.createConfirmationToken(
      userA.id,
      userA.email + 'x',
    );
    const res = await request(app.getHttpServer())
      .post(`/user/is-confirmation-token-valid/`)
      .send({
        token: fakeConfToken,
      } as ConfirmationRequest)
      .set('Cookie', cookies)
      .expect(201);

    expect(res.body.success).toBe(undefined);

    const userPostResend = await prisma.userAccounts.findUnique({
      where: {
        id: userA.id,
      },
    });

    expect(userPostResend.hitConfirmationUrl).toBeNull();
  });

  it('should set resetToken when forgot-password is called', async () => {
    const userA = await prisma.userAccounts.create({
      data: await userFactory(),
    });

    const mockforgotPassword = jest.spyOn(testEmailService, 'forgotPassword');
    const res = await request(app.getHttpServer())
      .put(`/user/forgot-password/`)
      .send({
        email: userA.email,
      } as EmailAndAppUrl)
      .expect(200);

    expect(res.body.success).toBe(true);

    const userPostResend = await prisma.userAccounts.findUnique({
      where: {
        id: userA.id,
      },
    });

    expect(userPostResend.resetToken).not.toBeNull();
    expect(mockforgotPassword.mock.calls.length).toBe(1);
  });

  it('should create public user', async () => {
    const juris = await prisma.jurisdictions.create({
      data: jurisdictionFactory(),
    });

    const data = await applicationFactory();
    data.applicant.create.emailAddress = 'publicuser@email.com';
    const application = await prisma.applications.create({
      data,
    });

    const res = await request(app.getHttpServer())
      .post(`/user/`)
      .send({
        firstName: 'Public User firstName',
        lastName: 'Public User lastName',
        password: 'example password 1',
        email: 'publicUser@email.com',
        jurisdictions: [{ id: juris.id }],
      } as UserCreate)
      .set('Cookie', cookies)
      .expect(201);

    expect(res.body.firstName).toEqual('Public User firstName');
    expect(res.body.jurisdictions).toEqual([
      expect.objectContaining({ id: juris.id, name: juris.name }),
    ]);
    expect(res.body.email).toEqual('publicuser@email.com');

    const applicationsOnUser = await prisma.userAccounts.findUnique({
      include: {
        applications: true,
      },
      where: {
        id: res.body.id,
      },
    });
    expect(applicationsOnUser.applications.map((app) => app.id)).toContain(
      application.id,
    );
  });

  it('should create parter user', async () => {
    const juris = await prisma.jurisdictions.create({
      data: jurisdictionFactory(),
    });

    const res = await request(app.getHttpServer())
      .post(`/user/invite`)
      .send({
        firstName: 'Partner User firstName',
        lastName: 'Partner User lastName',
        password: 'example password 1',
        email: 'partnerUser@email.com',
        jurisdictions: [{ id: juris.id }],
        agreedToTermsOfService: true,
        userRoles: {
          isAdmin: true,
        },
      } as UserInvite)
      .set('Cookie', cookies)
      .expect(201);

    expect(res.body.firstName).toEqual('Partner User firstName');
    expect(res.body.jurisdictions).toEqual([
      expect.objectContaining({ id: juris.id, name: juris.name }),
    ]);
    expect(res.body.email).toEqual('partneruser@email.com');
  });
});
