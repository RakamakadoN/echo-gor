// api/[...path].ts
import express from "express";

// src/dataMock.ts
var initialOrganizations = [
  { id: "org-echo-gor", name: "\u042D\u0445\u043E \u0413\u043E\u0440 (\u041A\u0430\u0432\u043A\u0430\u0437\u0441\u043A\u0438\u0435 \u0442\u0430\u043D\u0446\u044B)", slug: "echo-gor", status: "active" }
];
var orgId = "org-echo-gor";
var initialBranches = [
  {
    id: "branch-almaty",
    organizationId: orgId,
    name: "\u0410\u043D\u0441\u0430\u043C\u0431\u043B\u044C \u0410\u043B\u043C\u0430\u0442\u044B (\u0424\u043B\u0430\u0433\u043C\u0430\u043D)",
    city: "\u0410\u043B\u043C\u0430\u0442\u044B",
    address: "\u0443\u043B. \u0410\u0431\u0430\u044F, 45",
    managerName: "\u0410\u0441\u043B\u0430\u043D\u0431\u0435\u043A \u0411\u043E\u043B\u043E\u0442\u0430\u0435\u0432",
    phone: "+7 (727) 001-20-20",
    hallsCount: 3
  },
  {
    id: "branch-astana",
    organizationId: orgId,
    name: "\u0424\u0438\u043B\u0438\u0430\u043B \u0410\u0441\u0442\u0430\u043D\u0430 \u0416\u0443\u043B\u0434\u044B\u0437",
    city: "\u0410\u0441\u0442\u0430\u043D\u0430",
    address: "\u043F\u0440. \u041A\u0430\u0431\u0430\u043D\u0431\u0430\u0439 \u0431\u0430\u0442\u044B\u0440\u0430, 12\u0410",
    managerName: "\u041C\u0430\u0433\u043E\u043C\u0435\u0434 \u0414\u0430\u0443\u0434\u043E\u0432",
    phone: "+7 (7172) 150-30-40",
    hallsCount: 2
  },
  {
    id: "branch-shymkent",
    organizationId: orgId,
    name: "\u0420\u0435\u0437\u0438\u0434\u0435\u043D\u0446\u0438\u044F \u041E\u0440\u0434\u0430-\u042E\u043D\u0438\u043E\u0440",
    city: "\u0428\u044B\u043C\u043A\u0435\u043D\u0442",
    address: "\u043F\u0440. \u0422\u0430\u0443\u043A\u0435 \u0445\u0430\u043D\u0430, 8",
    managerName: "\u0417\u0435\u043B\u0438\u043C\u0445\u0430\u043D \u042E\u0441\u0443\u043F\u043E\u0432",
    phone: "+7 (7252) 777-95-95",
    hallsCount: 2
  }
];
var initialHalls = [
  { id: "hall-almaty-1", branchId: "branch-almaty", name: "\u0417\u0430\u043B \u0410\u043B\u0430\u0442\u0430\u0443 (\u0411\u043E\u043B\u044C\u0448\u043E\u0439)", capacity: 40 },
  { id: "hall-almaty-2", branchId: "branch-almaty", name: "\u0417\u0430\u043B \u041A\u043E\u043A-\u0422\u043E\u0431\u0435 (\u0421\u0440\u0435\u0434\u043D\u0438\u0439)", capacity: 25 },
  { id: "hall-almaty-3", branchId: "branch-almaty", name: "\u0417\u0430\u043B \u041C\u0435\u0434\u0435\u043E (\u041C\u0430\u043B\u044B\u0439)", capacity: 15 },
  { id: "hall-ast-1", branchId: "branch-astana", name: "\u0417\u0430\u043B \u0411\u0430\u0439\u0442\u0435\u0440\u0435\u043A", capacity: 30 },
  { id: "hall-ast-2", branchId: "branch-astana", name: "\u0417\u0430\u043B \u0425\u0430\u043D \u0428\u0430\u0442\u044B\u0440", capacity: 20 },
  { id: "hall-shym-1", branchId: "branch-shymkent", name: "\u0417\u0430\u043B \u041E\u0440\u0434\u0430 (\u0413\u043B\u0430\u0432\u043D\u044B\u0439)", capacity: 35 },
  { id: "hall-shym-2", branchId: "branch-shymkent", name: "\u0417\u0430\u043B \u0410\u0440\u044B\u0441 (\u041C\u0430\u043B\u044B\u0439)", capacity: 15 }
];
var initialTeachers = [
  {
    id: "teach-aslan",
    organizationId: orgId,
    name: "\u0410\u0441\u043B\u0430\u043D \u041F\u043B\u0438\u0435\u0432",
    photoUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&fit=crop&q=80",
    specialties: ["\u041C\u0443\u0436\u0441\u043A\u0430\u044F \u043B\u0435\u0437\u0433\u0438\u043D\u043A\u0430", "\u0421\u0438\u043C\u0434", "\u0425\u043E\u043D\u0433\u0430", "\u0422\u0440\u044E\u043A\u043E\u0432\u0430\u044F \u0442\u0435\u0445\u043D\u0438\u043A\u0430"],
    phone: "+7 (701) 441-11-22",
    bio: "\u0417\u0430\u0441\u043B\u0443\u0436\u0435\u043D\u043D\u044B\u0439 \u0430\u0440\u0442\u0438\u0441\u0442 \u0440\u0435\u0441\u043F\u0443\u0431\u043B\u0438\u043A\u0438, \u044D\u043A\u0441-\u0441\u043E\u043B\u0438\u0441\u0442 \u0433\u043E\u0441\u0443\u0434\u0430\u0440\u0441\u0442\u0432\u0435\u043D\u043D\u043E\u0433\u043E \u0430\u043D\u0441\u0430\u043C\u0431\u043B\u044F. \u041E\u043F\u044B\u0442 \u043F\u0440\u0435\u043F\u043E\u0434\u0430\u0432\u0430\u043D\u0438\u044F \u0431\u043E\u043B\u0435\u0435 15 \u043B\u0435\u0442.",
    experienceYears: 18
  },
  {
    id: "teach-fatima",
    organizationId: orgId,
    name: "\u0424\u0430\u0442\u0438\u043C\u0430 \u0426\u0430\u0440\u0438\u043A\u0430\u0435\u0432\u0430",
    photoUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&fit=crop&q=80",
    specialties: ["\u0416\u0435\u043D\u0441\u043A\u0430\u044F \u043B\u0435\u0437\u0433\u0438\u043D\u043A\u0430 (\u041F\u043B\u0430\u0432\u043D\u044B\u0435 \u0442\u0430\u043D\u0446\u044B)", "\u0414\u0435\u0432\u0438\u0447\u044C\u044F \u043F\u043B\u0430\u0441\u0442\u0438\u043A\u0430", "\u041A\u0430\u0440\u0442\u0443\u043B\u0438"],
    phone: "+7 (702) 895-33-44",
    bio: "\u041C\u0430\u0441\u0442\u0435\u0440 \u0441\u043F\u043E\u0440\u0442\u0430 \u043F\u043E \u0445\u0443\u0434\u043E\u0436\u0435\u0441\u0442\u0432\u0435\u043D\u043D\u043E\u0439 \u0433\u0438\u043C\u043D\u0430\u0441\u0442\u0438\u043A\u0435 \u0438 \u043F\u0440\u043E\u0444\u0435\u0441\u0441\u0438\u043E\u043D\u0430\u043B\u044C\u043D\u0430\u044F \u0438\u0441\u043F\u043E\u043B\u043D\u0438\u0442\u0435\u043B\u044C\u043D\u0438\u0446\u0430 \u043A\u0430\u0432\u043A\u0430\u0437\u0441\u043A\u0438\u0445 \u0431\u0430\u043B\u044C\u043D\u044B\u0445 \u0438 \u043D\u0430\u0440\u043E\u0434\u043D\u044B\u0445 \u0442\u0430\u043D\u0446\u0435\u0432.",
    experienceYears: 11
  },
  {
    id: "teach-shamil",
    organizationId: orgId,
    name: "\u0428\u0430\u043C\u0438\u043B\u044C \u0413\u0430\u043C\u0437\u0430\u0442\u043E\u0432",
    photoUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&fit=crop&q=80",
    specialties: ["\u041B\u0435\u0437\u0433\u0438\u043D\u043A\u0430 \u0431\u044B\u0441\u0442\u0440\u0430\u044F \u043F\u0430\u0440\u043D\u0430\u044F", "\u0413\u0430\u043D\u0434\u0430\u0433\u0430\u043D", "\u041A\u0438\u043D\u0442\u043E\u0443\u0440\u0438", "\u0418\u0433\u0440\u0430 \u043D\u0430 \u0431\u0430\u0440\u0430\u0431\u0430\u043D\u0435 (\u0414\u043E\u0443\u043B)"],
    phone: "+7 (707) 111-55-66",
    bio: "\u0421\u043F\u0435\u0446\u0438\u0430\u043B\u0438\u0441\u0442 \u043F\u043E \u0444\u043E\u043B\u044C\u043A\u043B\u043E\u0440\u043D\u044B\u043C \u043A\u0430\u0432\u043A\u0430\u0437\u0441\u043A\u0438\u043C \u0442\u0430\u043D\u0446\u0430\u043C \u0414\u0430\u0433\u0435\u0441\u0442\u0430\u043D\u0430 \u0438 \u0413\u0440\u0443\u0437\u0438\u0438. \u042D\u043D\u0435\u0440\u0433\u0438\u0447\u043D\u044B\u0439 \u043D\u043E\u0432\u0430\u0442\u043E\u0440.",
    experienceYears: 9
  }
];
var initialGroups = [
  {
    id: "group-almaty-ensemble",
    organizationId: orgId,
    branchId: "branch-almaty",
    name: "\u0421\u0442\u0430\u0440\u0448\u0438\u0439 \u041A\u0430\u0432\u043A\u0430\u0437\u0441\u043A\u0438\u0439 \u0410\u043D\u0441\u0430\u043C\u0431\u043B\u044C",
    teacherId: "teach-aslan",
    hallId: "hall-almaty-1",
    scheduleText: "\u041F\u043D, \u0421\u0440, \u041F\u0442 19:30 - 21:00",
    days: ["\u041F\u043D", "\u0421\u0440", "\u041F\u0442"],
    time: "19:30",
    ageGroup: "16+ \u043B\u0435\u0442",
    level: "\u0410\u043D\u0441\u0430\u043C\u0431\u043B\u044C",
    studentCount: 4
  },
  {
    id: "group-almaty-kids-1",
    organizationId: orgId,
    branchId: "branch-almaty",
    name: "\u041C\u043B\u0430\u0434\u0448\u0438\u0435 \u0434\u0436\u0438\u0433\u0438\u0442\u044B (\u041E\u0441\u043D\u043E\u0432\u044B)",
    teacherId: "teach-aslan",
    hallId: "hall-almaty-2",
    scheduleText: "\u0412\u0442, \u0427\u0442 16:00 - 17:00",
    days: ["\u0412\u0442", "\u0427\u0442"],
    time: "16:00",
    ageGroup: "6-8 \u043B\u0435\u0442",
    level: "\u041D\u0430\u0447\u0438\u043D\u0430\u044E\u0449\u0438\u0435",
    studentCount: 3
  },
  {
    id: "group-almaty-girls",
    organizationId: orgId,
    branchId: "branch-almaty",
    name: "\u0413\u0440\u0430\u0446\u0438\u044F \u0433\u043E\u0440 (\u041C\u043B\u0430\u0434\u0448\u0438\u0439 \u0434\u0435\u0432\u0438\u0447\u0438\u0439)",
    teacherId: "teach-fatima",
    hallId: "hall-almaty-2",
    scheduleText: "\u041F\u043D, \u0421\u0440, \u041F\u0442 16:30 - 18:00",
    days: ["\u041F\u043D", "\u0421\u0440", "\u041F\u0442"],
    time: "16:30",
    ageGroup: "9-13 \u043B\u0435\u0442",
    level: "\u041F\u0440\u043E\u0434\u043E\u043B\u0436\u0430\u044E\u0449\u0438\u0435",
    studentCount: 3
  }
];
var initialGuardians = [
  { id: "guard-alina", organizationId: orgId, fullName: "\u0410\u043B\u0438\u043D\u0430 \u0411\u043E\u043B\u043E\u0442\u0430\u0435\u0432\u0430", phone: "+7 (701) 400-30-30", email: "alina.b@example.com" },
  { id: "guard-khetag", organizationId: orgId, fullName: "\u0425\u0435\u0442\u0430\u0433 \u0414\u0437\u0430\u0433\u043E\u0435\u0432", phone: "+7 (701) 333-55-77" },
  { id: "guard-zarema", organizationId: orgId, fullName: "\u0417\u0430\u0440\u0435\u043C\u0430 \u0413\u0430\u0434\u0436\u0438\u0435\u0432\u0430", phone: "+7 (702) 789-01-01" },
  { id: "guard-zelimkhan", organizationId: orgId, fullName: "\u0417\u0435\u043B\u0438\u043C\u0445\u0430\u043D \u042E\u0441\u0443\u043F\u043E\u0432", phone: "+7 (999) 777-95-95" }
];
var initialStudents = [
  {
    id: "stud-soslan",
    organizationId: orgId,
    name: "\u0421\u043E\u0441\u043B\u0430\u043D \u0411\u043E\u043B\u043E\u0442\u0430\u0435\u0432",
    age: 17,
    photoUrl: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&fit=crop&q=80",
    branchId: "branch-almaty",
    groupIds: ["group-almaty-ensemble"],
    teacherId: "teach-aslan",
    parentName: "\u0410\u043B\u0438\u043D\u0430 \u0411\u043E\u043B\u043E\u0442\u0430\u0435\u0432\u0430",
    parentPhone: "+7 (701) 400-30-30",
    guardians: [initialGuardians[0]],
    balance: 15e3,
    artistLevel: "\u0421\u043E\u043B\u0438\u0441\u0442" /* SOLOIST */,
    artistLevelPoints: 850,
    achievements: [],
    performances: [],
    notes: [],
    attendance: {},
    subscriptions: [
      { id: "sub-1", studentId: "stud-soslan", name: "\u0410\u0431\u043E\u043D\u0435\u043C\u0435\u043D\u0442 \u0410\u043D\u0441\u0430\u043C\u0431\u043B\u044C (12 \u0437\u0430\u043D\u044F\u0442\u0438\u0439)", price: 4500, lessonsTotal: 12, lessonsLeft: 8, validUntil: "2026-06-25", isAutoRenew: true, status: "active" }
    ]
  },
  {
    id: "stud-alan",
    organizationId: orgId,
    name: "\u0410\u043B\u0430\u043D \u0414\u0437\u0430\u0433\u043E\u0435\u0432",
    age: 16,
    photoUrl: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&fit=crop&q=80",
    branchId: "branch-astana",
    groupIds: ["group-almaty-ensemble"],
    teacherId: "teach-aslan",
    parentName: "\u0425\u0435\u0442\u0430\u0433 \u0414\u0437\u0430\u0433\u043E\u0435\u0432",
    parentPhone: "+7 (701) 333-55-77",
    guardians: [initialGuardians[1]],
    balance: -45e3,
    artistLevel: "\u041F\u0440\u0435\u0434\u0441\u0442\u0430\u0432\u0438\u0442\u0435\u043B\u044C \u0448\u043A\u043E\u043B\u044B" /* SCHOOL_REPRESENTATIVE */,
    artistLevelPoints: 512,
    achievements: [],
    performances: [],
    notes: [],
    attendance: {},
    subscriptions: [
      { id: "sub-2", studentId: "stud-alan", name: "\u0410\u0431\u043E\u043D\u0435\u043C\u0435\u043D\u0442 \u0410\u043D\u0441\u0430\u043C\u0431\u043B\u044C (12 \u0437\u0430\u043D\u044F\u0442\u0438\u0439)", price: 4500, lessonsTotal: 12, lessonsLeft: 0, validUntil: "2026-05-30", isAutoRenew: false, status: "expired" }
    ],
    paymentStatus: "\u0412 \u043E\u0436\u0438\u0434\u0430\u043D\u0438\u0438 \u043E\u043F\u043B\u0430\u0442\u044B"
  }
];
var initialAnnouncements = [
  {
    id: "ann-1",
    organizationId: orgId,
    title: "\u0411\u043E\u043B\u044C\u0448\u043E\u0439 \u041B\u0435\u0442\u043D\u0438\u0439 \u041A\u043E\u043D\u0446\u0435\u0440\u0442 \u0432 \u0410\u043B\u043C\u0430\u0442\u044B!",
    content: "\u0423\u0432\u0430\u0436\u0430\u0435\u043C\u044B\u0435 \u0443\u0447\u0435\u043D\u0438\u043A\u0438, \u0440\u043E\u0434\u0438\u0442\u0435\u043B\u0438 \u0438 \u043F\u0440\u0435\u043F\u043E\u0434\u0430\u0432\u0430\u0442\u0435\u043B\u0438! 25 \u0438\u044E\u043D\u044F \u0441\u043E\u0441\u0442\u043E\u0438\u0442\u0441\u044F \u043D\u0430\u0448\u0435\u043C\u0443 \u0433\u043E\u0434\u043E\u0432\u043E\u043C\u0443 \u043E\u0442\u0447\u0435\u0442\u043D\u043E\u043C\u0443 \u043A\u043E\u043D\u0446\u0435\u0440\u0442\u0443 \u0432\u043E \u0414\u0432\u043E\u0440\u0446\u0435 \u0420\u0435\u0441\u043F\u0443\u0431\u043B\u0438\u043A\u0438 \u0410\u043B\u043C\u0430\u0442\u044B. \u0420\u0435\u043F\u0435\u0442\u0438\u0446\u0438\u0438 \u0434\u043B\u044F \u0441\u0431\u043E\u0440\u043D\u043E\u0433\u043E \u0430\u043D\u0441\u0430\u043C\u0431\u043B\u044F \u0431\u0443\u0434\u0443\u0442 \u043F\u0440\u043E\u0445\u043E\u0434\u0438\u0442\u044C \u0435\u0436\u0435\u0434\u043D\u0435\u0432\u043D\u043E \u0441 18:00. \u041F\u0440\u0438\u0441\u0443\u0442\u0441\u0442\u0432\u0438\u0435 \u043E\u0431\u044F\u0437\u0430\u0442\u0435\u043B\u044C\u043D\u043E \u0432\u0441\u0435\u043C \u0441\u043E\u043B\u0438\u0441\u0442\u0430\u043C \u0438 \u043A\u0430\u043D\u0434\u0438\u0434\u0430\u0442\u0430\u043C!",
    date: "2026-05-28",
    authorId: "owner-1",
    authorName: "\u0410\u0441\u043B\u0430\u043D\u0431\u0435\u043A \u0411\u043E\u043B\u043E\u0442\u0430\u0435\u0432",
    authorRole: "\u0412\u043B\u0430\u0434\u0435\u043B\u0435\u0446",
    likes: 24,
    isImportant: true
  }
];
var initialPayments = [
  { id: "p-pay-1", organizationId: orgId, branchId: "branch-almaty", studentId: "stud-soslan", amount: 45e3, date: "2026-05-24", type: "subscription", description: "\u041E\u043F\u043B\u0430\u0442\u0430 \u0430\u0431\u043E\u043D\u0435\u043C\u0435\u043D\u0442\u0430 \u0410\u043D\u0441\u0430\u043C\u0431\u043B\u044C \u21161", method: "card", status: "paid" }
];
var initialFinanceTransactions = [
  {
    id: "ft-1",
    organizationId: orgId,
    branchId: "branch-almaty",
    studentId: "stud-soslan",
    paymentId: "p-pay-1",
    amount: 45e3,
    type: "income",
    category: "tuition",
    description: "\u041E\u043F\u043B\u0430\u0442\u0430 \u0430\u0431\u043E\u043D\u0435\u043C\u0435\u043D\u0442\u0430 \u0410\u043D\u0441\u0430\u043C\u0431\u043B\u044C \u21161",
    createdAt: "2026-05-24T10:00:00Z"
  }
];
var initialAuditLogs = [
  { id: "log-1", organizationId: orgId, timestamp: "2026-05-31T09:12:00Z", userEmail: "owner@danceos.ru", userRole: "\u0412\u043B\u0430\u0434\u0435\u043B\u0435\u0446", action: "\u041F\u0440\u043E\u0441\u043C\u043E\u0442\u0440 \u043A\u043E\u043D\u0441\u043E\u043B\u0438\u0434\u0438\u0440\u043E\u0432\u0430\u043D\u043D\u043E\u0433\u043E \u0444\u0438\u043D\u0430\u043D\u0441\u043E\u0432\u043E\u0433\u043E \u043E\u0442\u0447\u0435\u0442\u0430", details: "\u0423\u0441\u043F\u0435\u0448\u043D\u0430\u044F \u0432\u044B\u0433\u0440\u0443\u0437\u043A\u0430 \u0437\u0430 \u043C\u0430\u0439 2026 \u0433\u043E\u0434\u0430" }
];
function getExecutiveSummary(branches, groups, students, payments) {
  return {
    todayRevenue: 4500,
    thisMonthRevenue: 124e3,
    activeStudentsTotal: students.length + 154,
    activeSubscriptionsCount: 148,
    overallAttendanceRate: 94,
    churnRate: 1.8,
    newRegistrationsToday: 4,
    branchMetrics: branches.map((b) => ({
      branchId: b.id,
      branchName: b.name,
      studentsCount: students.filter((s) => s.branchId === b.id).length + 20,
      revenue: 14e4,
      attendanceRate: 95,
      capacityRate: 80
    })),
    teacherPerformance: [
      {
        teacherId: "teach-aslan",
        teacherName: "\u0410\u0441\u043B\u0430\u043D \u041F\u043B\u0438\u0435\u0432",
        studentsCount: 65,
        retentionRate: 97.4,
        averageAttendance: 94.2
      }
    ]
  };
}

// animated-bar-chart-video/src/data/templateRegistry.ts
var seconds = (value) => value * 30;
var videoTemplates = [
  {
    id: "student-achievement",
    version: "1.0.0",
    name: "Student Achievement Video",
    goal: "\u041E\u0442\u043C\u0435\u0442\u0438\u0442\u044C \u0434\u043E\u0441\u0442\u0438\u0436\u0435\u043D\u0438\u0435 \u0443\u0447\u0435\u043D\u0438\u043A\u0430 \u0438 \u0434\u0430\u0442\u044C \u0440\u043E\u0434\u0438\u0442\u0435\u043B\u044F\u043C \u044D\u043C\u043E\u0446\u0438\u043E\u043D\u0430\u043B\u044C\u043D\u044B\u0439 \u043F\u043E\u0432\u043E\u0434 \u0433\u043E\u0440\u0434\u0438\u0442\u044C\u0441\u044F \u043F\u0440\u043E\u0433\u0440\u0435\u0441\u0441\u043E\u043C.",
    audience: ["parents", "students", "teachers", "public"],
    defaultDurationSeconds: 24,
    supportedFormats: ["reel-9x16", "story-9x16", "square-1x1", "landscape-16x9"],
    requiredData: ["student", "achievement", "teacher", "branch", "media"],
    visualStyle: "\u0422\u0435\u043C\u043D\u0430\u044F \u0441\u0446\u0435\u043D\u0430, \u043C\u044F\u0433\u043A\u0438\u0439 \u0437\u043E\u043B\u043E\u0442\u043E\u0439 \u0441\u0432\u0435\u0442, \u043F\u043E\u0440\u0442\u0440\u0435\u0442 \u0443\u0447\u0435\u043D\u0438\u043A\u0430, \u0430\u043A\u043A\u0443\u0440\u0430\u0442\u043D\u0430\u044F \u0446\u0435\u0440\u0435\u043C\u043E\u043D\u0438\u0430\u043B\u044C\u043D\u043E\u0441\u0442\u044C.",
    scenePlan: [
      { id: "opening", title: "\u0418\u043C\u044F \u0443\u0447\u0435\u043D\u0438\u043A\u0430", kind: "title", durationInFrames: seconds(4) },
      { id: "achievement", title: "\u0414\u043E\u0441\u0442\u0438\u0436\u0435\u043D\u0438\u0435", kind: "portrait", durationInFrames: seconds(6) },
      { id: "proof", title: "\u041A\u0430\u0434\u0440\u044B \u043F\u0440\u043E\u0433\u0440\u0435\u0441\u0441\u0430", kind: "montage", durationInFrames: seconds(8) },
      { id: "final", title: "\u042D\u0445\u043E \u0413\u043E\u0440", kind: "cta", durationInFrames: seconds(6) }
    ]
  },
  {
    id: "concert-announcement",
    version: "1.0.0",
    name: "Concert Announcement Video",
    goal: "\u0421\u043E\u0437\u0434\u0430\u0442\u044C \u043F\u0440\u0435\u043C\u0438\u0430\u043B\u044C\u043D\u044B\u0439 \u0430\u043D\u043E\u043D\u0441 \u043A\u043E\u043D\u0446\u0435\u0440\u0442\u0430 \u0441 \u0434\u0430\u0442\u043E\u0439, \u043C\u0435\u0441\u0442\u043E\u043C, \u0443\u0447\u0430\u0441\u0442\u043D\u0438\u043A\u0430\u043C\u0438 \u0438 \u043F\u0440\u0438\u0437\u044B\u0432\u043E\u043C \u043F\u0440\u0438\u0439\u0442\u0438.",
    audience: ["parents", "students", "public"],
    defaultDurationSeconds: 30,
    supportedFormats: ["reel-9x16", "story-9x16", "square-1x1", "landscape-16x9"],
    requiredData: ["event", "date", "location", "groups", "teachers", "media", "cta"],
    visualStyle: "\u0410\u0444\u0438\u0448\u0430 \u0431\u043E\u043B\u044C\u0448\u043E\u0433\u043E \u0430\u043D\u0441\u0430\u043C\u0431\u043B\u044F: \u0441\u0446\u0435\u043D\u0430, \u043F\u0440\u043E\u0436\u0435\u043A\u0442\u043E\u0440\u044B, \u0447\u0435\u0440\u043D\u044B\u0439 \u0444\u043E\u043D, \u0437\u043E\u043B\u043E\u0442\u043E \u0438 \u0433\u043B\u0443\u0431\u043E\u043A\u0438\u0439 \u0431\u043E\u0440\u0434\u043E\u0432\u044B\u0439.",
    scenePlan: [
      { id: "poster", title: "\u041D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 \u043A\u043E\u043D\u0446\u0435\u0440\u0442\u0430", kind: "title", durationInFrames: seconds(6) },
      { id: "energy", title: "\u041A\u0430\u0434\u0440\u044B \u043F\u0440\u043E\u0448\u043B\u044B\u0445 \u0432\u044B\u0441\u0442\u0443\u043F\u043B\u0435\u043D\u0438\u0439", kind: "montage", durationInFrames: seconds(10) },
      { id: "details", title: "\u0414\u0430\u0442\u0430 \u0438 \u043C\u0435\u0441\u0442\u043E", kind: "metrics", durationInFrames: seconds(8) },
      { id: "cta", title: "\u041F\u0440\u0438\u0433\u043B\u0430\u0448\u0435\u043D\u0438\u0435", kind: "cta", durationInFrames: seconds(6) }
    ]
  },
  {
    id: "event-recap",
    version: "1.0.0",
    name: "Event Recap Video",
    goal: "\u0421\u043E\u0431\u0440\u0430\u0442\u044C \u0438\u0442\u043E\u0433\u0438 \u0441\u043E\u0431\u044B\u0442\u0438\u044F \u0432 \u0434\u0438\u043D\u0430\u043C\u0438\u0447\u043D\u044B\u0439, \u043D\u043E \u0434\u043E\u0441\u0442\u043E\u0439\u043D\u044B\u0439 \u0440\u043E\u043B\u0438\u043A \u0434\u043B\u044F \u0430\u0440\u0445\u0438\u0432\u0430 \u0438 \u0441\u043E\u0446\u0441\u0435\u0442\u0435\u0439.",
    audience: ["parents", "teachers", "owner", "public"],
    defaultDurationSeconds: 45,
    supportedFormats: ["reel-9x16", "square-1x1", "landscape-16x9"],
    requiredData: ["event", "participants", "groups", "results", "media", "metrics"],
    visualStyle: "\u0420\u0438\u0442\u043C\u0438\u0447\u043D\u044B\u0439 \u043C\u043E\u043D\u0442\u0430\u0436 \u0441 \u043A\u0440\u0443\u043F\u043D\u044B\u043C\u0438 \u044D\u043C\u043E\u0446\u0438\u044F\u043C\u0438, \u0441\u0446\u0435\u043D\u043E\u0439, \u0437\u043E\u043B\u043E\u0442\u044B\u043C\u0438 \u043F\u043E\u0434\u043F\u0438\u0441\u044F\u043C\u0438 \u0438 \u0447\u0438\u0441\u0442\u044B\u043C\u0438 \u0446\u0438\u0444\u0440\u0430\u043C\u0438.",
    scenePlan: [
      { id: "opening", title: "\u041D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 \u0441\u043E\u0431\u044B\u0442\u0438\u044F", kind: "title", durationInFrames: seconds(5) },
      { id: "backstage", title: "\u041F\u043E\u0434\u0433\u043E\u0442\u043E\u0432\u043A\u0430", kind: "montage", durationInFrames: seconds(10) },
      { id: "stage", title: "\u0412\u044B\u0441\u0442\u0443\u043F\u043B\u0435\u043D\u0438\u044F", kind: "montage", durationInFrames: seconds(15) },
      { id: "results", title: "\u0418\u0442\u043E\u0433\u0438", kind: "metrics", durationInFrames: seconds(9) },
      { id: "final", title: "\u041E\u0431\u0449\u0438\u0439 \u0444\u0438\u043D\u0430\u043B", kind: "cta", durationInFrames: seconds(6) }
    ]
  },
  {
    id: "teacher-profile",
    version: "1.0.0",
    name: "Teacher Profile Video",
    goal: "\u041F\u043E\u043A\u0430\u0437\u0430\u0442\u044C \u043F\u0440\u0435\u043F\u043E\u0434\u0430\u0432\u0430\u0442\u0435\u043B\u044F \u043A\u0430\u043A \u0441\u0438\u043B\u044C\u043D\u043E\u0433\u043E \u043D\u0430\u0441\u0442\u0430\u0432\u043D\u0438\u043A\u0430, \u043A\u043E\u0442\u043E\u0440\u044B\u0439 \u0432\u0435\u0434\u0435\u0442 \u0443\u0447\u0435\u043D\u0438\u043A\u043E\u0432 \u043A \u0441\u0446\u0435\u043D\u0435.",
    audience: ["parents", "students", "public"],
    defaultDurationSeconds: 36,
    supportedFormats: ["reel-9x16", "square-1x1", "landscape-16x9"],
    requiredData: ["teacher", "experience", "specialties", "groups", "media", "quote"],
    visualStyle: "\u0410\u0432\u0442\u043E\u0440\u0438\u0442\u0435\u0442\u043D\u044B\u0439 \u043F\u043E\u0440\u0442\u0440\u0435\u0442, \u0442\u0435\u043C\u043D\u044B\u0439 \u0444\u043E\u043D, \u0442\u0435\u043F\u043B\u044B\u0439 \u0441\u0446\u0435\u043D\u0438\u0447\u0435\u0441\u043A\u0438\u0439 \u0441\u0432\u0435\u0442, \u0441\u0442\u0440\u043E\u0433\u0430\u044F \u0442\u0438\u043F\u043E\u0433\u0440\u0430\u0444\u0438\u043A\u0430.",
    scenePlan: [
      { id: "portrait", title: "\u041F\u043E\u0440\u0442\u0440\u0435\u0442 \u043F\u0440\u0435\u043F\u043E\u0434\u0430\u0432\u0430\u0442\u0435\u043B\u044F", kind: "portrait", durationInFrames: seconds(7) },
      { id: "craft", title: "\u041E\u043F\u044B\u0442 \u0438 \u043D\u0430\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u044F", kind: "metrics", durationInFrames: seconds(8) },
      { id: "class", title: "\u0420\u0430\u0431\u043E\u0442\u0430 \u0441 \u0443\u0447\u0435\u043D\u0438\u043A\u0430\u043C\u0438", kind: "montage", durationInFrames: seconds(12) },
      { id: "quote", title: "\u0426\u0438\u0442\u0430\u0442\u0430 \u043D\u0430\u0441\u0442\u0430\u0432\u043D\u0438\u043A\u0430", kind: "quote", durationInFrames: seconds(5) },
      { id: "cta", title: "\u0417\u0430\u043F\u0438\u0441\u044C \u0432 \u0433\u0440\u0443\u043F\u043F\u0443", kind: "cta", durationInFrames: seconds(4) }
    ]
  },
  {
    id: "teacher-spotlight",
    version: "1.0.0",
    name: "Teacher Spotlight Trailer",
    goal: "\u0410\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u0435\u0441\u043A\u0438 \u0441\u043E\u0431\u0440\u0430\u0442\u044C \u043F\u0440\u0435\u043C\u0438\u0430\u043B\u044C\u043D\u044B\u0439 \u0442\u0440\u0435\u0439\u043B\u0435\u0440 \u043F\u0440\u0435\u043F\u043E\u0434\u0430\u0432\u0430\u0442\u0435\u043B\u044F \u0438\u0437 CRM-\u0441\u0442\u0430\u0442\u0438\u0441\u0442\u0438\u043A\u0438, \u0433\u0440\u0443\u043F\u043F, \u043A\u043E\u043D\u0446\u0435\u0440\u0442\u043E\u0432 \u0438 \u0431\u043B\u0430\u0433\u043E\u0434\u0430\u0440\u043D\u043E\u0441\u0442\u0435\u0439.",
    audience: ["parents", "students", "teachers", "public"],
    defaultDurationSeconds: 20,
    supportedFormats: ["reel-9x16", "story-9x16", "square-1x1"],
    requiredData: ["teacher", "experience", "achievements", "groups", "concerts", "studentThanks"],
    visualStyle: "\u041F\u0440\u0435\u043C\u0438\u0430\u043B\u044C\u043D\u044B\u0439 \u0442\u0440\u0435\u0439\u043B\u0435\u0440 \u0438\u0437\u0432\u0435\u0441\u0442\u043D\u043E\u0433\u043E \u0430\u0440\u0442\u0438\u0441\u0442\u0430: \u0442\u0435\u043C\u043D\u0430\u044F \u0441\u0446\u0435\u043D\u0430, \u0436\u0435\u0441\u0442\u043A\u0438\u0439 \u0437\u043E\u043B\u043E\u0442\u043E\u0439 \u0441\u0432\u0435\u0442, \u0431\u044B\u0441\u0442\u0440\u044B\u0435 \u0442\u0438\u0442\u0440\u044B, \u0441\u043E\u0446\u0438\u0430\u043B\u044C\u043D\u043E\u0435 \u0434\u043E\u043A\u0430\u0437\u0430\u0442\u0435\u043B\u044C\u0441\u0442\u0432\u043E.",
    scenePlan: [
      { id: "cold-open", title: "\u041D\u0430\u0441\u0442\u0430\u0432\u043D\u0438\u043A \u0441\u0446\u0435\u043D\u044B", kind: "title", durationInFrames: seconds(3) },
      { id: "hero", title: "\u041F\u043E\u0440\u0442\u0440\u0435\u0442 \u043F\u0440\u0435\u043F\u043E\u0434\u0430\u0432\u0430\u0442\u0435\u043B\u044F", kind: "portrait", durationInFrames: seconds(3.5) },
      { id: "legacy", title: "\u0421\u0442\u0430\u0436 \u0438 \u043A\u043E\u043D\u0446\u0435\u0440\u0442\u044B", kind: "metrics", durationInFrames: seconds(3) },
      { id: "groups", title: "\u0413\u0440\u0443\u043F\u043F\u044B", kind: "metrics", durationInFrames: seconds(4) },
      { id: "achievements", title: "\u0414\u043E\u0441\u0442\u0438\u0436\u0435\u043D\u0438\u044F", kind: "montage", durationInFrames: seconds(3.5) },
      { id: "thanks", title: "\u0411\u043B\u0430\u0433\u043E\u0434\u0430\u0440\u043D\u043E\u0441\u0442\u0438", kind: "quote", durationInFrames: seconds(2) },
      { id: "final", title: "\u042D\u0445\u043E \u0413\u043E\u0440", kind: "cta", durationInFrames: seconds(1) }
    ]
  },
  {
    id: "branch-weekly-report",
    version: "1.0.0",
    name: "Branch Weekly Report Video",
    goal: "\u0414\u0430\u0442\u044C \u0440\u0443\u043A\u043E\u0432\u043E\u0434\u0438\u0442\u0435\u043B\u044E \u0438 \u0432\u043B\u0430\u0434\u0435\u043B\u044C\u0446\u0443 \u043A\u043E\u0440\u043E\u0442\u043A\u0443\u044E \u0443\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0447\u0435\u0441\u043A\u0443\u044E \u043A\u0430\u0440\u0442\u0438\u043D\u0443 \u043D\u0435\u0434\u0435\u043B\u0438 \u043F\u043E \u0444\u0438\u043B\u0438\u0430\u043B\u0443.",
    audience: ["owner", "teachers"],
    defaultDurationSeconds: 60,
    supportedFormats: ["landscape-16x9", "story-9x16"],
    requiredData: ["branch", "week", "students", "attendance", "leads", "payments", "media"],
    visualStyle: "\u041F\u0440\u0435\u043C\u0438\u0430\u043B\u044C\u043D\u044B\u0439 dashboard video: \u0442\u0435\u043C\u043D\u044B\u0439 \u0444\u043E\u043D, \u0447\u0438\u0441\u0442\u044B\u0435 \u0447\u0438\u0441\u043B\u0430, \u0441\u043F\u043E\u043A\u043E\u0439\u043D\u044B\u0435 \u0433\u0440\u0430\u0444\u0438\u043A\u0438, \u0437\u043E\u043B\u043E\u0442\u043E \u0434\u043B\u044F \u0443\u0441\u043F\u0435\u0445\u043E\u0432.",
    scenePlan: [
      { id: "period", title: "\u0424\u0438\u043B\u0438\u0430\u043B \u0438 \u043D\u0435\u0434\u0435\u043B\u044F", kind: "title", durationInFrames: seconds(6) },
      { id: "numbers", title: "\u0413\u043B\u0430\u0432\u043D\u044B\u0435 \u0446\u0438\u0444\u0440\u044B", kind: "metrics", durationInFrames: seconds(16) },
      { id: "groups", title: "\u0413\u0440\u0443\u043F\u043F\u044B \u043D\u0435\u0434\u0435\u043B\u0438", kind: "metrics", durationInFrames: seconds(14) },
      { id: "moment", title: "\u041C\u043E\u043C\u0435\u043D\u0442 \u043D\u0435\u0434\u0435\u043B\u0438", kind: "montage", durationInFrames: seconds(12) },
      { id: "focus", title: "\u0417\u043E\u043D\u044B \u0432\u043D\u0438\u043C\u0430\u043D\u0438\u044F", kind: "cta", durationInFrames: seconds(12) }
    ]
  },
  {
    id: "owner-network-summary",
    version: "1.0.0",
    name: "Owner Network Summary Video",
    goal: "\u0421\u043E\u0431\u0440\u0430\u0442\u044C executive summary \u043F\u043E \u0432\u0441\u0435\u0439 \u0441\u0435\u0442\u0438: \u0440\u043E\u0441\u0442, \u0440\u0438\u0441\u043A\u0438, \u0444\u0438\u043B\u0438\u0430\u043B\u044B, \u0441\u043E\u0431\u044B\u0442\u0438\u044F \u0438 \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u044F.",
    audience: ["owner"],
    defaultDurationSeconds: 75,
    supportedFormats: ["landscape-16x9", "story-9x16"],
    requiredData: ["networkMetrics", "branchMetrics", "revenue", "attendance", "risks", "events"],
    visualStyle: "\u0421\u0438\u043B\u044C\u043D\u0430\u044F \u0443\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0447\u0435\u0441\u043A\u0430\u044F \u0437\u0430\u0441\u0442\u0430\u0432\u043A\u0430: \u0433\u043E\u0440\u043D\u044B\u0439 \u0441\u0438\u043B\u0443\u044D\u0442, \u0442\u043E\u043D\u043A\u0438\u0435 \u0437\u043E\u043B\u043E\u0442\u044B\u0435 \u043B\u0438\u043D\u0438\u0438, \u0441\u0442\u0440\u043E\u0433\u0430\u044F \u0430\u043D\u0430\u043B\u0438\u0442\u0438\u043A\u0430.",
    scenePlan: [
      { id: "network", title: "\u0421\u0435\u0442\u044C \u042D\u0445\u043E \u0413\u043E\u0440", kind: "title", durationInFrames: seconds(7) },
      { id: "total", title: "\u041E\u0431\u0449\u0438\u0435 \u043F\u043E\u043A\u0430\u0437\u0430\u0442\u0435\u043B\u0438", kind: "metrics", durationInFrames: seconds(18) },
      { id: "branches", title: "\u0424\u0438\u043B\u0438\u0430\u043B\u044B", kind: "metrics", durationInFrames: seconds(18) },
      { id: "events", title: "\u0421\u043E\u0431\u044B\u0442\u0438\u044F \u0438 \u0434\u043E\u0441\u0442\u0438\u0436\u0435\u043D\u0438\u044F", kind: "montage", durationInFrames: seconds(14) },
      { id: "actions", title: "\u0420\u0435\u0448\u0435\u043D\u0438\u044F \u043D\u0435\u0434\u0435\u043B\u0438", kind: "cta", durationInFrames: seconds(18) }
    ]
  },
  {
    id: "artist-journey",
    version: "1.0.0",
    name: "Artist Journey Video",
    goal: "\u041F\u043E\u043A\u0430\u0437\u0430\u0442\u044C \u043F\u0443\u0442\u044C \u0443\u0447\u0435\u043D\u0438\u043A\u0430 \u043E\u0442 \u043F\u0435\u0440\u0432\u044B\u0445 \u0437\u0430\u043D\u044F\u0442\u0438\u0439 \u0434\u043E \u0441\u0446\u0435\u043D\u044B \u043A\u0430\u043A \u044D\u043C\u043E\u0446\u0438\u043E\u043D\u0430\u043B\u044C\u043D\u0443\u044E \u0438\u0441\u0442\u043E\u0440\u0438\u044E \u0440\u043E\u0441\u0442\u0430.",
    audience: ["parents", "students", "teachers", "public"],
    defaultDurationSeconds: 60,
    supportedFormats: ["reel-9x16", "square-1x1", "landscape-16x9"],
    requiredData: ["student", "startedAt", "teacher", "performances", "achievements", "media", "quote"],
    visualStyle: "\u041A\u0438\u043D\u0435\u043C\u0430\u0442\u043E\u0433\u0440\u0430\u0444\u0438\u0447\u043D\u044B\u0439 \u043F\u0443\u0442\u044C: \u0433\u043E\u0440\u044B \u043A\u0430\u043A \u0441\u0438\u043C\u0432\u043E\u043B \u0434\u0432\u0438\u0436\u0435\u043D\u0438\u044F, \u0441\u0432\u0435\u0442 \u0441\u0446\u0435\u043D\u044B \u043A\u0430\u043A \u043A\u0443\u043B\u044C\u043C\u0438\u043D\u0430\u0446\u0438\u044F.",
    scenePlan: [
      { id: "path", title: "\u041F\u0443\u0442\u044C \u0430\u0440\u0442\u0438\u0441\u0442\u0430", kind: "title", durationInFrames: seconds(7) },
      { id: "first-step", title: "\u041F\u0435\u0440\u0432\u044B\u0439 \u0448\u0430\u0433", kind: "timeline", durationInFrames: seconds(10) },
      { id: "discipline", title: "\u0422\u0440\u0435\u043D\u0438\u0440\u043E\u0432\u043A\u0438", kind: "montage", durationInFrames: seconds(14) },
      { id: "stage", title: "\u0421\u0446\u0435\u043D\u0430", kind: "montage", durationInFrames: seconds(14) },
      { id: "quote", title: "\u0421\u043B\u043E\u0432\u0430 \u043D\u0430\u0441\u0442\u0430\u0432\u043D\u0438\u043A\u0430", kind: "quote", durationInFrames: seconds(7) },
      { id: "future", title: "\u042D\u0442\u043E \u0442\u043E\u043B\u044C\u043A\u043E \u043D\u0430\u0447\u0430\u043B\u043E", kind: "cta", durationInFrames: seconds(8) }
    ]
  }
];
var getVideoTemplate = (templateId) => {
  return videoTemplates.find((template) => template.id === templateId);
};

// server/video/videoGeneration.ts
var jobs = /* @__PURE__ */ new Map();
var isTemplateId = (value) => {
  return videoTemplates.some((template) => template.id === value);
};
var createId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `video-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};
var formatMoney = (value) => {
  return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(value);
};
var attendanceRate = (student) => {
  const records = Object.values(student.attendance || {});
  if (records.length === 0) return "\u043D\u0435\u0442 \u0434\u0430\u043D\u043D\u044B\u0445";
  const present = records.filter((record) => record.status === "present").length;
  return `${Math.round(present / records.length * 100)}%`;
};
var findContext = (data, entityType, entityId) => {
  const student = data.students.find((item) => item.id === entityId) || data.students[0];
  const teacher = data.teachers.find((item) => item.id === entityId) || data.teachers.find((item) => item.id === student?.teacherId) || data.teachers[0];
  const group = data.groups.find((item) => student?.groupIds?.includes(item.id)) || data.groups[0];
  const branch = data.branches.find((item) => item.id === entityId) || data.branches.find((item) => item.id === student?.branchId || item.id === group?.branchId) || data.branches[0];
  return { student, teacher, group, branch };
};
var networkMetrics = (metrics) => [
  { label: "\u0410\u043A\u0442\u0438\u0432\u043D\u044B\u0435 \u0443\u0447\u0435\u043D\u0438\u043A\u0438", value: String(metrics.activeStudentsTotal), tone: "gold" },
  { label: "\u0412\u044B\u0440\u0443\u0447\u043A\u0430 \u043C\u0435\u0441\u044F\u0446\u0430", value: `${formatMoney(metrics.thisMonthRevenue)} \u20B8`, tone: "success" },
  { label: "\u041F\u043E\u0441\u0435\u0449\u0430\u0435\u043C\u043E\u0441\u0442\u044C", value: `${metrics.overallAttendanceRate}%`, tone: "gold" },
  { label: "\u041D\u043E\u0432\u044B\u0435 \u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0430\u0446\u0438\u0438", value: String(metrics.newRegistrationsToday), delta: "\u0441\u0435\u0433\u043E\u0434\u043D\u044F", tone: "success" },
  { label: "\u041E\u0442\u0442\u043E\u043A", value: `${metrics.churnRate}%`, tone: metrics.churnRate > 5 ? "warning" : "neutral" },
  { label: "\u0410\u0431\u043E\u043D\u0435\u043C\u0435\u043D\u0442\u044B", value: String(metrics.activeSubscriptionsCount), tone: "neutral" }
];
var createTeacherSpotlightPayload = (data, teacherId) => {
  const teacher = data.teachers.find((item) => item.id === teacherId) || data.teachers[0];
  const teacherGroups = data.groups.filter((item) => item.teacherId === teacher?.id);
  const teacherStudents = data.students.filter(
    (item) => item.teacherId === teacher?.id || teacherGroups.some((group) => item.groupIds?.includes(group.id))
  );
  const firstGroup = teacherGroups[0];
  const branch = data.branches.find((item) => item.id === firstGroup?.branchId) || data.branches.find((item) => teacherStudents.some((student) => student.branchId === item.id)) || data.branches[0];
  const concertsCount = teacherStudents.reduce((sum, item) => sum + item.performances.length, 0);
  const studentAchievementTitles = teacherStudents.flatMap((student) => student.achievements).filter((achievement) => achievement.unlockedAt).map((achievement) => achievement.title);
  const studentThanks = teacherStudents.flatMap(
    (student) => student.notes.filter((note) => !note.isPrivate).map((note) => ({
      text: note.content,
      studentName: student.name
    }))
  ).slice(0, 3);
  return {
    teacherName: teacher?.name || "\u041F\u0440\u0435\u043F\u043E\u0434\u0430\u0432\u0430\u0442\u0435\u043B\u044C \u042D\u0445\u043E \u0413\u043E\u0440",
    photoUrl: teacher?.photoUrl,
    experienceYears: teacher?.experienceYears || 5,
    specialties: teacher?.specialties?.length ? teacher.specialties : ["\u041A\u0430\u0432\u043A\u0430\u0437\u0441\u043A\u0438\u0439 \u0442\u0430\u043D\u0435\u0446"],
    achievements: [
      ...teacher?.bio ? [teacher.bio] : [],
      ...studentAchievementTitles,
      `\u041F\u043E\u0434\u0433\u043E\u0442\u043E\u0432\u043B\u0435\u043D\u043E \u043A\u043E\u043D\u0446\u0435\u0440\u0442\u043E\u0432: ${concertsCount || 1}`
    ].slice(0, 4),
    groups: (teacherGroups.length ? teacherGroups : data.groups.slice(0, 2)).map((group) => ({
      id: group.id,
      name: group.name,
      level: group.level,
      studentCount: group.studentCount
    })),
    concertsCount: concertsCount || 1,
    studentThanks: studentThanks.length > 0 ? studentThanks : [
      { text: "\u0421\u043F\u0430\u0441\u0438\u0431\u043E \u0437\u0430 \u0443\u0432\u0435\u0440\u0435\u043D\u043D\u043E\u0441\u0442\u044C \u043F\u0435\u0440\u0435\u0434 \u0441\u0446\u0435\u043D\u043E\u0439.", studentName: "\u0423\u0447\u0435\u043D\u0438\u043A\u0438" },
      { text: "\u041F\u043E\u0441\u043B\u0435 \u0437\u0430\u043D\u044F\u0442\u0438\u0439 \u0440\u0435\u0431\u0435\u043D\u043E\u043A \u0441\u0442\u0430\u043B \u0434\u0435\u0440\u0436\u0430\u0442\u044C\u0441\u044F \u0441\u0438\u043B\u044C\u043D\u0435\u0435.", studentName: "\u0420\u043E\u0434\u0438\u0442\u0435\u043B\u0438" }
    ],
    branchName: branch?.name || "\u042D\u0445\u043E \u0413\u043E\u0440"
  };
};
var createEchoGorVideoPayload = (data, templateId, entityType, entityId, format) => {
  const template = getVideoTemplate(templateId);
  if (!template) {
    throw new Error(`Unknown video template: ${templateId}`);
  }
  const { student, teacher, group, branch } = findContext(data, entityType, entityId);
  const metricItems = networkMetrics(data.metrics);
  const branchMetric = data.metrics.branchMetrics.find((item) => item.branchId === branch?.id);
  const studentName = student?.name || "\u0423\u0447\u0435\u043D\u0438\u043A \u042D\u0445\u043E \u0413\u043E\u0440";
  const teacherName = teacher?.name || "\u041F\u0440\u0435\u043F\u043E\u0434\u0430\u0432\u0430\u0442\u0435\u043B\u044C \u042D\u0445\u043E \u0413\u043E\u0440";
  const branchName = branch?.name || "\u042D\u0445\u043E \u0413\u043E\u0440";
  const titleByTemplate = {
    "student-achievement": `${studentName}: \u043D\u043E\u0432\u043E\u0435 \u0434\u043E\u0441\u0442\u0438\u0436\u0435\u043D\u0438\u0435`,
    "concert-announcement": "\u0411\u043E\u043B\u044C\u0448\u043E\u0439 \u043A\u043E\u043D\u0446\u0435\u0440\u0442 \u042D\u0445\u043E \u0413\u043E\u0440",
    "event-recap": "\u0418\u0442\u043E\u0433\u0438 \u0432\u044B\u0441\u0442\u0443\u043F\u043B\u0435\u043D\u0438\u044F",
    "teacher-profile": teacherName,
    "teacher-spotlight": `${teacherName}: Teacher Spotlight`,
    "branch-weekly-report": `\u0424\u0438\u043B\u0438\u0430\u043B ${branchName}`,
    "owner-network-summary": "\u0421\u0435\u0442\u044C \u042D\u0445\u043E \u0413\u043E\u0440",
    "artist-journey": `\u041F\u0443\u0442\u044C \u0430\u0440\u0442\u0438\u0441\u0442\u0430: ${studentName}`
  };
  const teacherGroups = data.groups.filter((item) => item.teacherId === teacher?.id);
  const teacherStudents = data.students.filter((item) => item.teacherId === teacher?.id || teacherGroups.some((group2) => item.groupIds?.includes(group2.id)));
  const teacherConcertsCount = teacherStudents.reduce((sum, item) => sum + item.performances.length, 0);
  const teacherAchievementsCount = teacherStudents.reduce(
    (sum, item) => sum + item.achievements.filter((achievement) => achievement.unlockedAt).length,
    0
  );
  const templateMetrics = {
    "student-achievement": [
      { label: "\u0423\u0440\u043E\u0432\u0435\u043D\u044C", value: student?.artistLevel || "\u041F\u0435\u0440\u0432\u044B\u0439 \u0448\u0430\u0433", tone: "gold" },
      { label: "\u041F\u043E\u0441\u0435\u0449\u0430\u0435\u043C\u043E\u0441\u0442\u044C", value: student ? attendanceRate(student) : "\u043D\u0435\u0442 \u0434\u0430\u043D\u043D\u044B\u0445", tone: "success" },
      { label: "\u0412\u044B\u0441\u0442\u0443\u043F\u043B\u0435\u043D\u0438\u044F", value: String(student?.performances.length || 0), tone: "gold" }
    ],
    "concert-announcement": [
      { label: "\u0414\u0430\u0442\u0430", value: "\u0421\u043A\u043E\u0440\u043E", tone: "gold" },
      { label: "\u0413\u0440\u0443\u043F\u043F\u044B", value: String(data.groups.length), tone: "neutral" },
      { label: "\u0424\u0438\u043B\u0438\u0430\u043B", value: branchName, tone: "gold" }
    ],
    "event-recap": [
      { label: "\u0423\u0447\u0430\u0441\u0442\u043D\u0438\u043A\u0438", value: String(data.students.length), tone: "gold" },
      { label: "\u0413\u0440\u0443\u043F\u043F\u044B", value: String(data.groups.length), tone: "neutral" },
      { label: "\u0412\u044B\u0441\u0442\u0443\u043F\u043B\u0435\u043D\u0438\u044F", value: String(data.students.reduce((sum, item) => sum + item.performances.length, 0)), tone: "success" }
    ],
    "teacher-profile": [
      { label: "\u041E\u043F\u044B\u0442", value: `${teacher?.experienceYears || 5} \u043B\u0435\u0442`, tone: "gold" },
      { label: "\u0413\u0440\u0443\u043F\u043F\u044B", value: String(data.groups.filter((item) => item.teacherId === teacher?.id).length || 1), tone: "neutral" },
      { label: "\u0423\u0447\u0435\u043D\u0438\u043A\u0438", value: String(data.students.filter((item) => item.teacherId === teacher?.id).length || group?.studentCount || 0), tone: "success" }
    ],
    "teacher-spotlight": [
      { label: "\u0421\u0442\u0430\u0436", value: `${teacher?.experienceYears || 5} \u043B\u0435\u0442`, tone: "gold" },
      { label: "\u0413\u0440\u0443\u043F\u043F\u044B", value: String(teacherGroups.length || 1), tone: "neutral" },
      { label: "\u0423\u0447\u0435\u043D\u0438\u043A\u0438", value: String(teacherStudents.length || group?.studentCount || 0), tone: "success" },
      { label: "\u041A\u043E\u043D\u0446\u0435\u0440\u0442\u044B", value: String(teacherConcertsCount || 1), tone: "gold" },
      { label: "\u0414\u043E\u0441\u0442\u0438\u0436\u0435\u043D\u0438\u044F", value: String(teacherAchievementsCount || 1), tone: "success" },
      { label: "\u0411\u043B\u0430\u0433\u043E\u0434\u0430\u0440\u043D\u043E\u0441\u0442\u0438", value: String(Math.max(teacherStudents.length, 3)), tone: "gold" }
    ],
    "branch-weekly-report": [
      { label: "\u0423\u0447\u0435\u043D\u0438\u043A\u0438", value: String(branchMetric?.studentsCount || data.students.length), tone: "gold" },
      { label: "\u0412\u044B\u0440\u0443\u0447\u043A\u0430", value: `${formatMoney(branchMetric?.revenue || 0)} \u20B8`, tone: "success" },
      { label: "\u041F\u043E\u0441\u0435\u0449\u0430\u0435\u043C\u043E\u0441\u0442\u044C", value: `${branchMetric?.attendanceRate || data.metrics.overallAttendanceRate}%`, tone: "gold" },
      { label: "\u0417\u0430\u043F\u043E\u043B\u043D\u044F\u0435\u043C\u043E\u0441\u0442\u044C", value: `${branchMetric?.capacityRate || 0}%`, tone: "neutral" },
      { label: "\u0413\u0440\u0443\u043F\u043F\u044B", value: String(data.groups.filter((item) => item.branchId === branch?.id).length), tone: "neutral" },
      { label: "\u041D\u043E\u0432\u044B\u0435 \u0437\u0430\u044F\u0432\u043A\u0438", value: String(data.metrics.newRegistrationsToday), tone: "success" }
    ],
    "owner-network-summary": metricItems,
    "artist-journey": [
      { label: "\u0423\u0440\u043E\u0432\u0435\u043D\u044C", value: student?.artistLevel || "\u041F\u0435\u0440\u0432\u044B\u0439 \u0448\u0430\u0433", tone: "gold" },
      { label: "\u0411\u0430\u043B\u043B\u044B \u043F\u0443\u0442\u0438", value: String(student?.artistLevelPoints || 0), tone: "success" },
      { label: "\u0421\u0446\u0435\u043D\u0430", value: String(student?.performances.length || 0), tone: "gold" }
    ]
  };
  const scenes = template.scenePlan.map((scene) => ({
    ...scene,
    subtitle: scene.kind === "metrics" ? "\u041A\u043B\u044E\u0447\u0435\u0432\u044B\u0435 \u0434\u0430\u043D\u043D\u044B\u0435 \u0438\u0437 CRM" : void 0,
    body: scene.kind === "cta" ? "\u0421\u0438\u043B\u044C\u043D\u0430\u044F \u0448\u043A\u043E\u043B\u0430 \u0440\u0430\u0441\u0442\u0435\u0442 \u0447\u0435\u0440\u0435\u0437 \u0434\u0438\u0441\u0446\u0438\u043F\u043B\u0438\u043D\u0443, \u0441\u0446\u0435\u043D\u0443 \u0438 \u0443\u0432\u0430\u0436\u0435\u043D\u0438\u0435 \u043A \u0442\u0440\u0430\u0434\u0438\u0446\u0438\u0438." : void 0,
    metrics: templateMetrics[templateId]
  }));
  return {
    templateId,
    templateVersion: template.version,
    format,
    title: titleByTemplate[templateId],
    subtitle: template.goal,
    audience: template.audience,
    durationInFrames: template.defaultDurationSeconds * 30,
    fps: 30,
    entity: {
      type: entityType,
      id: entityId,
      name: entityType === "teacher" ? teacherName : entityType === "branch" ? branchName : studentName
    },
    brand: {
      schoolName: "\u042D\u0445\u043E \u0413\u043E\u0440",
      branchName,
      city: branch?.city
    },
    people: {
      student: student ? { id: student.id, name: student.name, photoUrl: student.photoUrl } : void 0,
      teacher: teacher ? { id: teacher.id, name: teacher.name, photoUrl: teacher.photoUrl } : void 0
    },
    metrics: templateMetrics[templateId],
    quote: {
      text: "\u0412 \u0442\u0430\u043D\u0446\u0435 \u0440\u0435\u0431\u0435\u043D\u043E\u043A \u0443\u0447\u0438\u0442\u0441\u044F \u0434\u0435\u0440\u0436\u0430\u0442\u044C \u0441\u043F\u0438\u043D\u0443, \u0441\u043B\u043E\u0432\u043E \u0438 \u0445\u0430\u0440\u0430\u043A\u0442\u0435\u0440.",
      author: teacherName
    },
    callToAction: {
      label: templateId === "teacher-spotlight" ? "Teacher Spotlight" : templateId.includes("report") || templateId.includes("summary") ? "\u0424\u043E\u043A\u0443\u0441 \u043D\u0435\u0434\u0435\u043B\u0438" : "\u042D\u0445\u043E \u0413\u043E\u0440",
      detail: templateId === "teacher-spotlight" ? `${teacherName}, ${branchName}` : templateId.includes("report") || templateId.includes("summary") ? "\u0414\u0435\u0439\u0441\u0442\u0432\u043E\u0432\u0430\u0442\u044C \u043F\u043E \u0434\u0430\u043D\u043D\u044B\u043C" : "\u0428\u043A\u043E\u043B\u0430 \u043A\u0430\u0432\u043A\u0430\u0437\u0441\u043A\u043E\u0433\u043E \u0442\u0430\u043D\u0446\u0430"
    },
    media: [
      ...student?.photoUrl ? [{ id: `${student.id}-photo`, type: "image", url: student.photoUrl, title: student.name }] : [],
      ...teacher?.photoUrl ? [{ id: `${teacher.id}-photo`, type: "image", url: teacher.photoUrl, title: teacher.name }] : []
    ],
    scenes
  };
};
var listVideoTemplates = () => videoTemplates;
var getVideoJobs = () => [...jobs.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
var getVideoJob = (id) => jobs.get(id);
var createVideoRenderJob = (data, input) => {
  if (!isTemplateId(input.templateId)) {
    throw new Error("Unknown video template");
  }
  const entityType = input.entityType || "network";
  const entityId = input.entityId || "network";
  const format = input.format || (input.templateId.includes("report") || input.templateId.includes("summary") ? "landscape-16x9" : "reel-9x16");
  const payloadSnapshot = createEchoGorVideoPayload(data, input.templateId, entityType, entityId, format);
  const templatePayloadSnapshot = input.templateId === "teacher-spotlight" ? createTeacherSpotlightPayload(data, entityId) : void 0;
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const job = {
    id: createId(),
    templateId: input.templateId,
    templateVersion: payloadSnapshot.templateVersion,
    status: "queued",
    progress: 0,
    priority: input.priority || "normal",
    requestedBy: input.requestedBy,
    entityType,
    entityId,
    format,
    payloadSnapshot,
    templatePayloadSnapshot,
    createdAt: now
  };
  jobs.set(job.id, job);
  simulateQueue(job.id);
  return job;
};
var updateJob = (id, patch) => {
  const job = jobs.get(id);
  if (!job) return;
  jobs.set(id, { ...job, ...patch });
};
var simulateQueue = (id) => {
  setTimeout(() => updateJob(id, { status: "validating", progress: 12, startedAt: (/* @__PURE__ */ new Date()).toISOString() }), 250);
  setTimeout(() => updateJob(id, { status: "rendering", progress: 45 }), 800);
  setTimeout(() => updateJob(id, { status: "uploading", progress: 82 }), 1400);
  setTimeout(() => {
    const job = jobs.get(id);
    if (!job) return;
    updateJob(id, {
      status: "completed",
      progress: 100,
      finishedAt: (/* @__PURE__ */ new Date()).toISOString(),
      output: {
        storageUrl: `/storage/videos/${job.templateId}/${job.id}/video.mp4`,
        thumbnailUrl: `/storage/videos/${job.templateId}/${job.id}/thumbnail.jpg`,
        shareUrl: `/share/video/${job.id}`
      }
    });
  }, 2200);
};

// server/mvpApi.ts
var orgId2 = "00000000-0000-0000-0000-000000000001";
var demoBranchAlmaty = "00000000-0000-0000-0000-000000000101";
var demoUsers = [
  { userId: "00000000-0000-0000-0000-000000001001", organizationId: orgId2, role: "owner", branchId: null, dbBranchId: null, fullName: "\u0410\u0441\u043B\u0430\u043D\u0431\u0435\u043A \u0411\u043E\u043B\u043E\u0442\u0430\u0435\u0432" },
  { userId: "00000000-0000-0000-0000-000000001002", organizationId: orgId2, role: "branch_manager", branchId: "branch-almaty", dbBranchId: demoBranchAlmaty, fullName: "\u041C\u0430\u0433\u043E\u043C\u0435\u0434 \u0414\u0430\u0443\u0434\u043E\u0432" },
  { userId: "00000000-0000-0000-0000-000000001003", organizationId: orgId2, role: "admin", branchId: "branch-almaty", dbBranchId: demoBranchAlmaty, fullName: "\u0424\u0430\u0442\u0438\u043C\u0430 \u0426\u0430\u0440\u0438\u043A\u0430\u0435\u0432\u0430" },
  { userId: "00000000-0000-0000-0000-000000001004", organizationId: orgId2, role: "teacher", branchId: "branch-almaty", dbBranchId: demoBranchAlmaty, fullName: "\u0410\u0441\u043B\u0430\u043D \u041F\u043B\u0438\u0435\u0432" }
];
var supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, "");
var supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
var supabaseEnabled = Boolean(supabaseUrl && supabaseKey);
function getSession(req) {
  const roleHeader = String(req.headers["x-demo-role"] || "owner");
  const userHeader = String(req.headers["x-demo-user-id"] || "");
  const byUser = demoUsers.find((user) => user.userId === userHeader);
  if (byUser) return byUser;
  return demoUsers.find((user) => user.role === roleHeader) || demoUsers[0];
}
function canSeeBranch(session, branchId) {
  if (session.role === "owner" || !branchId) return true;
  return branchId === session.branchId || branchId === session.dbBranchId;
}
async function supabaseFetch(table, query = "select=*", init = {}) {
  if (!supabaseEnabled) {
    throw new Error("Supabase is not configured");
  }
  const separator = query ? query.includes("?") ? "&" : "?" : "";
  const response = await fetch(`${supabaseUrl}/rest/v1/${table}${separator}${query}`, {
    ...init,
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...init.headers || {}
    }
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return response.json();
}
var toDate = (value) => value ? value.slice(0, 10) : (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
function fallbackPayload(session) {
  const branchFiltered = session.role === "owner" ? initialBranches : initialBranches.filter((branch) => branch.id === session.branchId);
  const branchIds = new Set(branchFiltered.map((branch) => branch.id));
  const groups = initialGroups.filter((group) => {
    if (session.role === "owner") return true;
    if (session.role === "teacher") return group.teacherId === session.userId;
    return branchIds.has(group.branchId);
  });
  const groupIds = new Set(groups.map((group) => group.id));
  const students = initialStudents.filter((student) => {
    const branchOk = session.role === "owner" || branchIds.has(student.branchId);
    const teacherOk = session.role !== "teacher" || student.teacherId === session.userId || student.groupIds.some((id) => groupIds.has(id));
    return branchOk && teacherOk;
  });
  const studentIds = new Set(students.map((student) => student.id));
  const payments = initialPayments.filter((payment) => studentIds.has(payment.studentId));
  return {
    mode: "mock",
    session,
    organizations: initialOrganizations,
    branches: branchFiltered,
    halls: initialHalls.filter((hall) => session.role === "owner" || branchIds.has(hall.branchId)),
    teachers: initialTeachers,
    groups,
    students,
    announcements: initialAnnouncements,
    payments,
    financeTransactions: initialFinanceTransactions,
    auditLogs: initialAuditLogs,
    metrics: getExecutiveSummary(branchFiltered, groups, students, payments)
  };
}
function mapDbUserToTeacher(user) {
  return {
    id: user.id,
    organizationId: user.organization_id,
    name: user.full_name,
    photoUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&fit=crop&q=80",
    specialties: user.specialization ? [user.specialization] : ["\u041A\u0430\u0432\u043A\u0430\u0437\u0441\u043A\u0438\u0439 \u0442\u0430\u043D\u0435\u0446"],
    phone: user.phone || "",
    bio: "\u041F\u0440\u0435\u043F\u043E\u0434\u0430\u0432\u0430\u0442\u0435\u043B\u044C \u0448\u043A\u043E\u043B\u044B \u042D\u0445\u043E \u0413\u043E\u0440.",
    experienceYears: 5
  };
}
function mapDbStudent(row, attendanceByStudent, subsByStudent) {
  const name = [row.first_name, row.last_name].filter(Boolean).join(" ") || row.full_name || "\u0423\u0447\u0435\u043D\u0438\u043A";
  return {
    id: row.id,
    organizationId: row.organization_id,
    name,
    age: row.birthday ? Math.max(4, (/* @__PURE__ */ new Date()).getFullYear() - new Date(row.birthday).getFullYear()) : 12,
    photoUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&fit=crop&q=80",
    branchId: row.branch_id,
    groupIds: row.group_id ? [row.group_id] : [],
    teacherId: row.teacher_id || "",
    parentName: row.parent_name || "\u0420\u043E\u0434\u0438\u0442\u0435\u043B\u044C",
    parentPhone: row.parent_phone || "",
    balance: row.status === "debt" ? -1 : 0,
    artistLevel: "\u041F\u0435\u0440\u0432\u044B\u0439 \u0448\u0430\u0433" /* FIRST_STEP */,
    artistLevelPoints: 0,
    achievements: [],
    performances: [],
    notes: [],
    attendance: attendanceByStudent.get(row.id) || {},
    subscriptions: (subsByStudent.get(row.id) || []).map((sub) => ({
      id: sub.id,
      studentId: sub.student_id,
      name: sub.plan_name || "\u0410\u0431\u043E\u043D\u0435\u043C\u0435\u043D\u0442",
      price: Number(sub.price || 0),
      lessonsTotal: sub.lessons_total || 0,
      lessonsLeft: sub.lessons_left || 0,
      validUntil: sub.ends_on,
      isAutoRenew: false,
      status: sub.status === "active" ? "active" : "expired"
    }))
  };
}
function mapDbPayment(row) {
  return {
    id: row.id,
    organizationId: row.organization_id,
    branchId: row.branch_id,
    studentId: row.student_id,
    amount: Number(row.amount || 0),
    date: toDate(row.paid_at),
    type: "subscription",
    description: row.comment || "\u041E\u043F\u043B\u0430\u0442\u0430",
    method: row.method || "cash",
    status: row.status === "paid" ? "paid" : "pending"
  };
}
async function dbBootstrap(session) {
  const orgFilter = `organization_id=eq.${session.organizationId}`;
  const [branches, halls, users, groups, studentsRaw, paymentsRaw, lessons, attendanceRaw, subscriptionsRaw, plans, financeTransactions] = await Promise.all([
    supabaseFetch("branches", `select=*&${orgFilter}`),
    supabaseFetch("halls", `select=*`),
    // Halls are filtered by branch in mapping
    supabaseFetch("users", `select=*&${orgFilter}`),
    supabaseFetch("groups", `select=*&${orgFilter}`),
    supabaseFetch("students", `select=*&${orgFilter}`),
    supabaseFetch("payments", `select=*&${orgFilter}&order=paid_at.desc`),
    supabaseFetch("schedule_lessons", `select=*&order=starts_at.desc`),
    // Cross-org lessons are unlikely but we keep mapping safe
    supabaseFetch("attendance", "select=*"),
    supabaseFetch("student_subscriptions", `select=*`),
    supabaseFetch("subscription_plans", `select=*&${orgFilter}`),
    supabaseFetch("finance_transactions", `select=*&${orgFilter}&order=created_at.desc`)
  ]);
  const groupById = new Map(groups.map((group) => [group.id, group]));
  const lessonById = new Map(lessons.map((lesson) => [lesson.id, lesson]));
  const planById = new Map(plans.map((plan) => [plan.id, plan]));
  const attendanceByStudent = /* @__PURE__ */ new Map();
  const subsByStudent = /* @__PURE__ */ new Map();
  attendanceRaw.forEach((row) => {
    const lesson = lessonById.get(row.lesson_id);
    if (!lesson) return;
    const date = toDate(lesson.starts_at);
    const current = attendanceByStudent.get(row.student_id) || {};
    current[date] = {
      date,
      status: row.status === "unknown" ? "unmarked" : row.status,
      markedBy: row.marked_by || void 0,
      note: row.comment || void 0
    };
    attendanceByStudent.set(row.student_id, current);
  });
  subscriptionsRaw.forEach((sub) => {
    const plan = planById.get(sub.plan_id);
    const list = subsByStudent.get(sub.student_id) || [];
    list.push({ ...sub, plan_name: plan?.name });
    subsByStudent.set(sub.student_id, list);
  });
  const teacherUsers = users.filter((user) => user.role === "teacher");
  const teachers = teacherUsers.map(mapDbUserToTeacher);
  const groupsMapped = groups.map((group) => ({
    id: group.id,
    organizationId: group.organization_id,
    branchId: group.branch_id,
    name: group.name,
    teacherId: group.teacher_id || "",
    hallId: group.hall_id || "",
    scheduleText: "\u041F\u043E \u0440\u0430\u0441\u043F\u0438\u0441\u0430\u043D\u0438\u044E",
    days: [],
    time: "",
    ageGroup: group.age_from && group.age_to ? `${group.age_from}-${group.age_to} \u043B\u0435\u0442` : "\u0412\u0441\u0435 \u0432\u043E\u0437\u0440\u0430\u0441\u0442\u044B",
    level: "MVP",
    studentCount: studentsRaw.filter((student) => student.group_id === group.id).length
  }));
  const students = studentsRaw.filter((student) => {
    if (session.role !== "teacher") return true;
    const group = groupById.get(student.group_id);
    return group?.teacher_id === session.userId;
  }).map((student) => {
    const group = groupById.get(student.group_id);
    return mapDbStudent({ ...student, teacher_id: group?.teacher_id }, attendanceByStudent, subsByStudent);
  });
  const visibleStudentIds = new Set(students.map((student) => student.id));
  const payments = paymentsRaw.filter((payment) => visibleStudentIds.has(payment.student_id)).map(mapDbPayment);
  return {
    mode: "supabase",
    session,
    organizations: initialOrganizations,
    branches: branches.map((branch) => ({
      id: branch.id,
      organizationId: branch.organization_id,
      name: branch.name,
      city: branch.city,
      address: branch.address,
      managerName: users.find((user) => user.id === branch.manager_id)?.full_name || "\u0420\u0443\u043A\u043E\u0432\u043E\u0434\u0438\u0442\u0435\u043B\u044C",
      phone: branch.phone || "",
      hallsCount: halls.filter((hall) => hall.branch_id === branch.id).length
    })),
    halls: halls.map((hall) => ({ id: hall.id, branchId: hall.branch_id, name: hall.name, capacity: hall.capacity || 0 })),
    teachers,
    groups: groupsMapped,
    students,
    announcements: initialAnnouncements,
    payments,
    financeTransactions,
    auditLogs: initialAuditLogs,
    metrics: getExecutiveSummary(branches, groupsMapped, students, payments)
  };
}
function registerMvpApi(app2) {
  app2.get("/api/mvp/session/demo-users", (_req, res) => {
    res.json({ users: demoUsers });
  });
  app2.post("/api/mvp/session/demo-login", (req, res) => {
    const requested = req.body?.userId || req.body?.role;
    const session = demoUsers.find((user) => user.userId === requested || user.role === requested) || demoUsers[0];
    res.json({ session });
  });
  app2.get("/api/mvp/bootstrap", async (req, res) => {
    const session = getSession(req);
    try {
      const payload = supabaseEnabled ? await dbBootstrap(session) : fallbackPayload(session);
      res.json(payload);
    } catch (error) {
      res.status(503).json({ ...fallbackPayload(session), error: error.message });
    }
  });
  app2.get("/api/mvp/kpi", async (req, res) => {
    const session = getSession(req);
    try {
      const payload = supabaseEnabled ? await dbBootstrap(session) : fallbackPayload(session);
      res.json({ mode: payload.mode, metrics: payload.metrics });
    } catch (error) {
      const payload = fallbackPayload(session);
      res.status(503).json({ mode: payload.mode, metrics: payload.metrics, error: error.message });
    }
  });
  app2.get("/api/mvp/video/templates", (_req, res) => {
    res.json({ templates: listVideoTemplates() });
  });
  app2.get("/api/mvp/video/jobs", (_req, res) => {
    res.json({ jobs: getVideoJobs() });
  });
  app2.get("/api/mvp/video/jobs/:jobId", (req, res) => {
    const job = getVideoJob(req.params.jobId);
    if (!job) {
      return res.status(404).json({ error: "Video render job not found" });
    }
    res.json({ job });
  });
  app2.post("/api/mvp/video/render", async (req, res) => {
    const session = getSession(req);
    const payload = req.body || {};
    if (!payload.templateId) {
      return res.status(400).json({ error: "templateId is required" });
    }
    try {
      const data = supabaseEnabled ? await dbBootstrap(session) : fallbackPayload(session);
      const job = createVideoRenderJob(data, {
        templateId: payload.templateId,
        entityType: payload.entityType,
        entityId: payload.entityId,
        format: payload.format,
        priority: payload.priority,
        requestedBy: session.userId
      });
      res.status(202).json({ job });
    } catch (error) {
      res.status(400).json({ error: error.message || "Unable to create video render job" });
    }
  });
  app2.post("/api/mvp/students", async (req, res) => {
    const session = getSession(req);
    const payload = req.body || {};
    if (!payload.name || !payload.branchId) {
      return res.status(400).json({ error: "name and branchId are required" });
    }
    if (!canSeeBranch(session, payload.branchId)) {
      return res.status(403).json({ error: "Branch access denied" });
    }
    if (!supabaseEnabled) {
      return res.status(503).json({ error: "Supabase is not configured" });
    }
    const [firstName, ...rest] = String(payload.name).trim().split(/\s+/);
    const inserted = await supabaseFetch("students", "", {
      method: "POST",
      body: JSON.stringify({
        organization_id: session.organizationId,
        branch_id: payload.branchId,
        group_id: payload.groupId || null,
        first_name: firstName || payload.name,
        last_name: rest.join(" ") || "-",
        parent_name: payload.parentName || null,
        parent_phone: payload.parentPhone || null,
        status: "active",
        comment: payload.comment || null
      })
    });
    res.status(201).json({ student: inserted[0] });
  });
  app2.post("/api/mvp/payments", async (req, res) => {
    const session = getSession(req);
    const payload = req.body || {};
    if (!payload.studentId || !payload.branchId || !payload.amount) {
      return res.status(400).json({ error: "studentId, branchId and amount are required" });
    }
    if (!canSeeBranch(session, payload.branchId)) {
      return res.status(403).json({ error: "Branch access denied" });
    }
    if (!supabaseEnabled) {
      return res.status(503).json({ error: "Supabase is not configured" });
    }
    const insertedPayment = await supabaseFetch("payments", "", {
      method: "POST",
      body: JSON.stringify({
        organization_id: session.organizationId,
        branch_id: payload.branchId,
        student_id: payload.studentId,
        amount: payload.amount,
        method: payload.method || "cash",
        status: "paid",
        comment: payload.description || "\u041E\u043F\u043B\u0430\u0442\u0430",
        created_by: session.userId.startsWith("demo-") ? null : session.userId
      })
    });
    await supabaseFetch("finance_transactions", "", {
      method: "POST",
      body: JSON.stringify({
        organization_id: session.organizationId,
        branch_id: payload.branchId,
        student_id: payload.studentId,
        payment_id: insertedPayment[0].id,
        amount: payload.amount,
        type: "income",
        category: "tuition",
        description: payload.description || "\u041E\u043F\u043B\u0430\u0442\u0430 \u0430\u0431\u043E\u043D\u0435\u043C\u0435\u043D\u0442\u0430"
      })
    });
    res.status(201).json({ payment: mapDbPayment(insertedPayment[0]) });
  });
  app2.post("/api/mvp/attendance", async (req, res) => {
    const session = getSession(req);
    const payload = req.body || {};
    if (!payload.studentId || !payload.status || !payload.lessonId && !payload.date) {
      return res.status(400).json({ error: "studentId, status and lessonId/date are required" });
    }
    if (!supabaseEnabled) {
      return res.status(503).json({ error: "Supabase is not configured" });
    }
    let lessonId = payload.lessonId;
    if (!lessonId) {
      const studentsRaw = await supabaseFetch("students", `select=*&id=eq.${payload.studentId}`);
      const student = studentsRaw[0];
      if (!student) return res.status(404).json({ error: "Student not found" });
      if (!canSeeBranch(session, student.branch_id)) {
        return res.status(403).json({ error: "Branch access denied" });
      }
      const start = (/* @__PURE__ */ new Date(`${payload.date}T00:00:00.000Z`)).toISOString();
      const endDate = /* @__PURE__ */ new Date(`${payload.date}T00:00:00.000Z`);
      endDate.setUTCDate(endDate.getUTCDate() + 1);
      const end = endDate.toISOString();
      const lessons = await supabaseFetch(
        "schedule_lessons",
        `select=*&group_id=eq.${student.group_id}&starts_at=gte.${encodeURIComponent(start)}&starts_at=lt.${encodeURIComponent(end)}&limit=1`
      );
      if (!lessons[0]) return res.status(404).json({ error: "Lesson not found for student group and date" });
      lessonId = lessons[0].id;
    }
    const rows = await supabaseFetch("attendance", "on_conflict=lesson_id,student_id", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify({
        lesson_id: lessonId,
        student_id: payload.studentId,
        status: payload.status === "unmarked" ? "unknown" : payload.status,
        marked_by: session.userId.startsWith("demo-") ? null : session.userId,
        marked_at: (/* @__PURE__ */ new Date()).toISOString(),
        comment: payload.comment || null
      })
    });
    if (payload.status === "present") {
      await supabaseFetch("finance_transactions", "", {
        method: "POST",
        body: JSON.stringify({
          organization_id: session.organizationId,
          student_id: payload.studentId,
          amount: 0,
          type: "debit",
          description: `\u0421\u043F\u0438\u0441\u0430\u043D\u0438\u0435 \u0437\u0430 \u0437\u0430\u043D\u044F\u0442\u0438\u0435 ${payload.date || "\u0441\u0435\u0433\u043E\u0434\u043D\u044F"}`
        })
      });
    }
    res.json({ attendance: rows[0] });
  });
  app2.post("/api/mvp/notifications", async (req, res) => {
    const session = getSession(req);
    const payload = req.body || {};
    if (!payload.body || !payload.recipient) {
      return res.status(400).json({ error: "recipient and body are required" });
    }
    if (!canSeeBranch(session, payload.branchId)) {
      return res.status(403).json({ error: "Branch access denied" });
    }
    if (!supabaseEnabled) {
      return res.status(503).json({ error: "Supabase is not configured" });
    }
    const inserted = await supabaseFetch("notifications", "", {
      method: "POST",
      body: JSON.stringify({
        branch_id: payload.branchId || session.dbBranchId,
        student_id: payload.studentId || null,
        created_by: session.userId.startsWith("demo-") ? null : session.userId,
        channel: payload.channel || "whatsapp",
        recipient: payload.recipient,
        subject: payload.subject || null,
        body: payload.body,
        status: "queued"
      })
    });
    res.status(201).json({ notification: inserted[0] });
  });
}

// api/[...path].ts
var app = express();
app.use(express.json());
registerMvpApi(app);
var path_default = app;
export {
  path_default as default
};
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
