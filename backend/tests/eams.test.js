const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../server');

jest.setTimeout(60000);

let mongoServer;

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

afterEach(async () => {
    if (mongoose.connection.readyState === 1) {
        const collections = mongoose.connection.collections;
        for (const key in collections) {
            try {
                await collections[key].deleteMany({});
            } catch (e) {
                // Ignore collection errors during cleanup
            }
        }
    }
});

const createTestBranch = async (suffix = '') => {
    const res = await request(app)
        .post('/api/branches')
        .send({
            name: `Branch_${Date.now()}_${suffix}`,
            address: {
                street: '123 Sukhumvit Road',
                city: 'Bangkok',
                state: 'Bangkok',
                country: 'Thailand',
                zipCode: '10110'
            },
            location: {
                type: 'Point',
                coordinates: [100.5018, 13.7563]
            }
        });
    return res.body.data;
};

const createTestShift = async (suffix = '') => {
    const res = await request(app)
        .post('/api/shifts')
        .send({
            name: `Shift_${Date.now()}_${suffix}`,
            startTime: '09:00',
            endTime: '18:00',
            gracePeriodMinutes: 15
        });
    return res.body.data;
};

describe('EAMS API Integration Tests', () => {
    test('GET / should return welcome message', async () => {
        const res = await request(app).get('/');
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.message).toContain('Welcome to EAMS');
    });

    // 1. Branch Tests
    test('POST /api/branches should create a new branch', async () => {
        const branch = await createTestBranch('hq');
        expect(branch).toBeDefined();
        expect(branch.name).toContain('hq');
    });

    test('GET /api/branches should return list of branches', async () => {
        await createTestBranch('list');
        const res = await request(app).get('/api/branches');
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.count).toBeGreaterThanOrEqual(1);
    });

    // 2. Shift Tests
    test('POST /api/shifts should create a new shift', async () => {
        const shift = await createTestShift('morning');
        expect(shift).toBeDefined();
        expect(shift.name).toContain('morning');
    });

    test('GET /api/shifts should return list of shifts', async () => {
        await createTestShift('list');
        const res = await request(app).get('/api/shifts');
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.count).toBeGreaterThanOrEqual(1);
    });

    // 3. Employee Tests
    test('POST /api/employees should create a new employee', async () => {
        const branch = await createTestBranch('emp');
        const shift = await createTestShift('emp');

        const res = await request(app)
            .post('/api/employees')
            .send({
                name: 'John Doe',
                email: `john.doe_${Date.now()}@example.com`,
                password: 'password123',
                role: 'Staff',
                branchId: branch._id,
                shiftId: shift._id,
                status: 'Active'
            });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data).toBeDefined();
    });

    test('GET /api/employees should return paginated list of employees', async () => {
        const res = await request(app).get('/api/employees');
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.count).toBeGreaterThanOrEqual(0);
    });

    // 4. Attendance Tests
    test('POST /api/attendance/check-in & check-out should work', async () => {
        const branch = await createTestBranch('att');
        const shift = await createTestShift('att');
        const empRes = await request(app).post('/api/employees').send({
            name: 'Jane Doe',
            email: `jane.doe_${Date.now()}@example.com`,
            password: 'password123',
            role: 'Staff',
            branchId: branch._id,
            shiftId: shift._id
        });
        const empId = empRes.body.data._id;

        const checkInRes = await request(app)
            .post('/api/attendance/check-in')
            .send({
                employeeId: empId,
                checkInTime: new Date().toISOString()
            });

        expect(checkInRes.status).toBe(200);
        expect(checkInRes.body.success).toBe(true);

        const checkOutRes = await request(app)
            .post('/api/attendance/check-out')
            .send({
                employeeId: empId,
                checkOutTime: new Date(Date.now() + 9 * 3600 * 1000).toISOString()
            });

        expect(checkOutRes.status).toBe(200);
        expect(checkOutRes.body.success).toBe(true);
    });

    // 5. Leave Tests
    test('Leave request workflow', async () => {
        const branch = await createTestBranch('leave');
        const shift = await createTestShift('leave');
        const empRes = await request(app).post('/api/employees').send({
            name: 'Leave User',
            email: `leave.user_${Date.now()}@example.com`,
            password: 'password123',
            role: 'Staff',
            branchId: branch._id,
            shiftId: shift._id
        });
        const empId = empRes.body.data._id;

        const leaveRes = await request(app)
            .post('/api/leaves')
            .send({
                employeeId: empId,
                leaveType: 'Annual',
                startDate: new Date().toISOString(),
                endDate: new Date(Date.now() + 86400000).toISOString(),
                reason: 'Vacation'
            });

        expect(leaveRes.status).toBe(201);
        const leaveIdLocal = leaveRes.body.data._id;

        const patchRes = await request(app)
            .patch(`/api/leaves/${leaveIdLocal}/status`)
            .send({
                status: 'Approved',
                approvedBy: empId
            });

        expect(patchRes.status).toBe(200);
        expect(patchRes.body.success).toBe(true);
        expect(patchRes.body.data.status).toBe('Approved');
    });

    // 6. Overtime Tests
    test('Overtime request workflow', async () => {
        const branch = await createTestBranch('ot');
        const shift = await createTestShift('ot');
        const empRes = await request(app).post('/api/employees').send({
            name: 'OT User',
            email: `ot.user_${Date.now()}@example.com`,
            password: 'password123',
            role: 'Staff',
            branchId: branch._id,
            shiftId: shift._id
        });
        const empId = empRes.body.data._id;

        const otRes = await request(app)
            .post('/api/overtime')
            .send({
                employeeId: empId,
                date: new Date().toISOString(),
                hours: 3,
                reason: 'Urgent task'
            });

        expect(otRes.status).toBe(201);
        const otIdLocal = otRes.body.data._id;

        const patchRes = await request(app)
            .patch(`/api/overtime/${otIdLocal}/status`)
            .send({
                status: 'Approved',
                approvedBy: empId
            });

        expect(patchRes.status).toBe(200);
        expect(patchRes.body.success).toBe(true);
        expect(patchRes.body.data.status).toBe('Approved');
    });

    // 7. Report Tests
    test('GET /api/reports/dashboard & monthly should return reports', async () => {
        const dashRes = await request(app).get('/api/reports/dashboard');
        expect(dashRes.status).toBe(200);
        expect(dashRes.body.success).toBe(true);

        const monthlyRes = await request(app).get('/api/reports/monthly');
        expect([200, 400]).toContain(monthlyRes.status);
    });
});
