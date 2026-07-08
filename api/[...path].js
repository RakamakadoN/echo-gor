// server/loadEnv.ts
import dotenv from "dotenv";
if (process.env.NODE_ENV !== "production") {
  dotenv.config();
}

// api/__entry.ts
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
  { id: "hall-almaty-1", branchId: "branch-almaty", name: "\u0417\u0430\u043B \u0410\u043B\u0430\u0442\u0430\u0443 (\u0411\u043E\u043B\u044C\u0448\u043E\u0439)", capacity: 40, description: "\u0411\u043E\u043B\u044C\u0448\u043E\u0439 \u0437\u0430\u043B \u0441 \u0437\u0435\u0440\u043A\u0430\u043B\u0430\u043C\u0438 \u0438 \u0441\u0446\u0435\u043D\u043E\u0439", status: "active" },
  { id: "hall-almaty-2", branchId: "branch-almaty", name: "\u0417\u0430\u043B \u041A\u043E\u043A-\u0422\u043E\u0431\u0435 (\u0421\u0440\u0435\u0434\u043D\u0438\u0439)", capacity: 25, description: "\u0421\u0440\u0435\u0434\u043D\u0438\u0439 \u0437\u0430\u043B \u0434\u043B\u044F \u0433\u0440\u0443\u043F\u043F\u043E\u0432\u044B\u0445 \u0437\u0430\u043D\u044F\u0442\u0438\u0439", status: "active" },
  { id: "hall-almaty-3", branchId: "branch-almaty", name: "\u0417\u0430\u043B \u041C\u0435\u0434\u0435\u043E (\u041C\u0430\u043B\u044B\u0439)", capacity: 15, description: "\u041C\u0430\u043B\u044B\u0439 \u0437\u0430\u043B \u0434\u043B\u044F \u0438\u043D\u0434\u0438\u0432\u0438\u0434\u0443\u0430\u043B\u044C\u043D\u044B\u0445 \u0437\u0430\u043D\u044F\u0442\u0438\u0439", status: "active" },
  { id: "hall-ast-1", branchId: "branch-astana", name: "\u0417\u0430\u043B \u0411\u0430\u0439\u0442\u0435\u0440\u0435\u043A", capacity: 30, description: "\u041F\u0440\u043E\u0441\u0442\u043E\u0440\u043D\u044B\u0439 \u0437\u0430\u043B", status: "active" },
  { id: "hall-ast-2", branchId: "branch-astana", name: "\u0417\u0430\u043B \u0425\u0430\u043D \u0428\u0430\u0442\u044B\u0440", capacity: 20, description: "\u041C\u0430\u043B\u044B\u0439 \u0437\u0430\u043B", status: "active" },
  { id: "hall-shym-1", branchId: "branch-shymkent", name: "\u0417\u0430\u043B \u041E\u0440\u0434\u0430 (\u0413\u043B\u0430\u0432\u043D\u044B\u0439)", capacity: 35, description: "\u0413\u043B\u0430\u0432\u043D\u044B\u0439 \u0437\u0430\u043B \u0444\u0438\u043B\u0438\u0430\u043B\u0430", status: "active" },
  { id: "hall-shym-2", branchId: "branch-shymkent", name: "\u0417\u0430\u043B \u0410\u0440\u044B\u0441 (\u041C\u0430\u043B\u044B\u0439)", capacity: 15, description: "\u041C\u0430\u043B\u044B\u0439 \u0437\u0430\u043B", status: "active" }
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
    capacity: 20,
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
    capacity: 16,
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
    capacity: 18,
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
    audience: "all",
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
function getExecutiveSummary(branches, groups, students, payments, teachers = []) {
  const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  const monthPrefix = today.slice(0, 7);
  const round1 = (n) => Math.round(n * 10) / 10;
  const isPaid = (p) => p.status === "paid";
  const paidSum = (list) => list.filter(isPaid).reduce((sum, p) => sum + (p.amount || 0), 0);
  const attendanceRate2 = (list) => {
    let present = 0;
    let marked = 0;
    list.forEach((s) => {
      Object.values(s.attendance || {}).forEach((a) => {
        if (!a || a.status === "unmarked") return;
        marked += 1;
        if (a.status === "present") present += 1;
      });
    });
    return marked ? Math.round(present / marked * 100) : 0;
  };
  const hasActiveSub = (s) => (s.subscriptions || []).some((sub) => sub.status === "active");
  const activeSubscriptionsCount = students.reduce(
    (count, s) => count + (s.subscriptions || []).filter((sub) => sub.status === "active").length,
    0
  );
  const churnRate = students.length ? round1(students.filter((s) => !hasActiveSub(s)).length / students.length * 100) : 0;
  return {
    todayRevenue: paidSum(payments.filter((p) => p.date === today)),
    thisMonthRevenue: paidSum(payments.filter((p) => (p.date || "").startsWith(monthPrefix))),
    activeStudentsTotal: students.length,
    activeSubscriptionsCount,
    overallAttendanceRate: attendanceRate2(students),
    churnRate,
    newRegistrationsToday: 0,
    // creation date is not available in this view
    branchMetrics: branches.map((b) => {
      const branchStudents = students.filter((s) => s.branchId === b.id);
      return {
        branchId: b.id,
        branchName: b.name,
        studentsCount: branchStudents.length,
        revenue: paidSum(payments.filter((p) => p.branchId === b.id)),
        attendanceRate: attendanceRate2(branchStudents),
        capacityRate: 0
        // hall capacities are not available in this view
      };
    }),
    teacherPerformance: teachers.map((t) => {
      const taught = students.filter((s) => s.teacherId === t.id);
      return {
        teacherId: t.id,
        teacherName: t.name,
        studentsCount: taught.length,
        retentionRate: taught.length ? round1(taught.filter(hasActiveSub).length / taught.length * 100) : 0,
        averageAttendance: attendanceRate2(taught)
      };
    })
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

// server/danceEventsParser.ts
function past(ctx) {
  return !!ctx.deadlineMs && Date.now() > ctx.deadlineMs;
}
function dbg(ctx, name) {
  if (!ctx.debug) return null;
  return ctx.debug[name] ??= { links: 0, prefiltered: 0, fetchErrors: 0 };
}
var CAUCASUS_KEYWORDS_CYR = [
  "\u043B\u0435\u0437\u0433\u0438\u043D\u043A",
  "\u043A\u0430\u0432\u043A\u0430\u0437",
  "\u0433\u043E\u0440\u0446\u044B",
  "\u0433\u043E\u0440\u044F\u043D\u043A",
  "\u0434\u0436\u0438\u0433\u0438\u0442",
  "\u0432\u0430\u0439\u043D\u0430\u0445",
  "\u043D\u043E\u0445\u0447\u043E",
  "\u0432\u0430\u0442\u0430\u043D",
  "\u043D\u0430\u043B\u044C\u043C\u044D\u0441",
  "\u043A\u0430\u0431\u0430\u0440\u0434\u0438\u043D\u043A",
  "\u044D\u0440\u0438\u0441\u0438\u043E\u043D\u0438",
  "\u0441\u0443\u0445\u0438\u0448\u0432\u0438\u043B\u0438",
  "\u0434\u0430\u0439\u043C\u043E\u0445\u043A",
  "\u0438\u043D\u0433\u0443\u0448\u0435\u0442",
  "\u0434\u0430\u0433\u0435\u0441\u0442\u0430\u043D",
  "\u043E\u0441\u0435\u0442\u0438\u043D",
  "\u0447\u0435\u0447\u0435\u043D",
  "\u0430\u0434\u044B\u0433",
  "\u0447\u0435\u0440\u043A\u0435\u0441",
  "\u0431\u0430\u043B\u043A\u0430\u0440",
  "\u043A\u0430\u0440\u0430\u0447\u0430\u0435\u0432",
  "\u0430\u0441\u0441\u044B",
  "\u0440\u0438\u0442\u043C\u044B \u043A\u0430\u0432\u043A\u0430\u0437\u0430",
  "\u0434\u0435\u0442\u0438 \u0433\u043E\u0440",
  "\u043F\u043B\u0430\u043C\u044F \u043A\u0430\u0432\u043A\u0430\u0437\u0430",
  "\u0446\u0432\u0435\u0442\u044B \u043A\u0430\u0432\u043A\u0430\u0437\u0430",
  "\u043B\u0435\u0433\u0435\u043D\u0434\u0430 \u043A\u0430\u0432\u043A\u0430\u0437\u0430",
  "\u043C\u043E\u043B\u043E\u0434\u043E\u0441\u0442\u044C \u043A\u0430\u0432\u043A\u0430\u0437\u0430",
  "\u0430\u043B\u0430\u043D\u044B",
  "\u043A\u0430\u0432\u043A\u0430\u0437\u0441\u043A",
  "\u043D\u0430\u0446\u0438\u043E\u043D\u0430\u043B\u044C\u043D \u0442\u0430\u043D\u0446",
  "\u043D\u0430\u0440\u043E\u0434\u043E\u0432 \u043A\u0430\u0432\u043A\u0430\u0437\u0430",
  "\u0437\u0438\u043A\u0440"
];
var CAUCASUS_KEYWORDS_TRANSLIT = [
  "lezgin",
  "kavkaz",
  "kabardin",
  "dagestan",
  "osetin",
  "chechen",
  "ingush",
  "adyg",
  "cherkes",
  "balkar",
  "karachaev",
  "vainah",
  "vaynah",
  "nohcho",
  "vatan",
  "nalmes",
  "erisioni",
  "suhishvili",
  "sukhishvili",
  "daymohk",
  "gorcy",
  "gorec",
  "dzhigit",
  "alan",
  "ritmy-kavkaza",
  "plamya-kavkaza",
  "ansambl",
  "ansamble",
  "tanca-narodov",
  "national-dance"
];
var TOURNAMENT_KEYWORDS = [
  "\u0442\u0443\u0440\u043D\u0438\u0440",
  "\u0447\u0435\u043C\u043F\u0438\u043E\u043D\u0430\u0442",
  "\u043F\u0435\u0440\u0432\u0435\u043D\u0441\u0442\u0432",
  "\u043A\u0443\u0431\u043E\u043A",
  "\u043A\u043E\u043D\u043A\u0443\u0440\u0441",
  "\u0441\u043E\u0440\u0435\u0432\u043D\u043E\u0432\u0430\u043D",
  "battle",
  "\u0431\u0430\u0442\u0442\u043B",
  "championship",
  "cup ",
  "-cup",
  "open ",
  "\u0433\u0440\u0430\u043D-\u043F\u0440\u0438",
  "\u0433\u0440\u0430\u043D \u043F\u0440\u0438",
  "\u0444\u0435\u0441\u0442\u0438\u0432\u0430\u043B\u044C-\u043A\u043E\u043D\u043A\u0443\u0440\u0441"
];
var KIDS_MARKERS = [
  "\u0434\u0435\u0442",
  "\u044E\u043D\u0438\u043E\u0440",
  "\u044E\u043D\u043E\u0448\u0435\u0441",
  "\u0431\u0435\u0431\u0438",
  "baby",
  "kids",
  "\u0448\u043A\u043E\u043B\u044C\u043D\u0438\u043A",
  "\u043C\u043B\u0430\u0434\u0448",
  "\u044E\u0432\u0435\u043D\u0430\u043B",
  "0+",
  "3+",
  "6+"
];
var ADULTS_MARKERS = [
  "\u0432\u0437\u0440\u043E\u0441\u043B",
  "\u0441\u0435\u043D\u044C\u043E\u0440",
  "senior",
  "professional",
  "\u043F\u0440\u043E\u0444\u0438",
  "18+",
  "21+",
  "adult"
];
var MONTHS = {
  \u044F\u043D\u0432: 1,
  \u0444\u0435\u0432: 2,
  \u043C\u0430\u0440: 3,
  \u0430\u043F\u0440: 4,
  \u043C\u0430\u0439: 5,
  \u043C\u0430\u044F: 5,
  \u0438\u044E\u043D: 6,
  \u0438\u044E\u043B: 7,
  \u0430\u0432\u0433: 8,
  \u0441\u0435\u043D: 9,
  \u043E\u043A\u0442: 10,
  \u043D\u043E\u044F: 11,
  \u0434\u0435\u043A: 12
};
var norm = (s) => s.toLowerCase().replace(/ё/g, "\u0435").replace(/\s+/g, " ").trim();
function hasAny(text, markers) {
  const t = norm(text);
  return markers.some((m) => t.includes(norm(m)));
}
function isCaucasian(title, slug = "") {
  return hasAny(title, CAUCASUS_KEYWORDS_CYR) || CAUCASUS_KEYWORDS_TRANSLIT.some((m) => norm(slug).includes(m));
}
function classifyEventType(title) {
  return hasAny(title, TOURNAMENT_KEYWORDS) ? "tournament" : "concert";
}
function classifyAudience(title, ageText = "") {
  const blob = `${title} ${ageText}`;
  const kids = hasAny(blob, KIDS_MARKERS);
  const adults = hasAny(blob, ADULTS_MARKERS);
  if (kids && !adults) return "kids";
  if (adults && !kids) return "adults";
  return "all";
}
function parseDates(dateText, now = /* @__PURE__ */ new Date()) {
  if (!dateText) return { start: null, end: null };
  const text = dateText.replace(/ /g, " ").trim();
  const dmy = [...text.matchAll(/(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{4})/g)];
  if (dmy.length) {
    const iso = (m) => `${m[3]}-${String(+m[2]).padStart(2, "0")}-${String(+m[1]).padStart(2, "0")}`;
    return { start: iso(dmy[0]), end: dmy[1] ? iso(dmy[1]) : null };
  }
  const md = text.match(/(\d{1,2})(?:\s*[–—-]\s*(\d{1,2}))?\s+([а-яё]+)/i);
  if (md) {
    const day = +md[1];
    const endDay = md[2] ? +md[2] : null;
    const monKey = norm(md[3]).slice(0, 3);
    const month = MONTHS[monKey];
    if (month) {
      let year = now.getFullYear();
      if (month < now.getMonth() + 1) year += 1;
      const pad = (n) => String(n).padStart(2, "0");
      const start = `${year}-${pad(month)}-${pad(day)}`;
      const end = endDay ? `${year}-${pad(month)}-${pad(endDay)}` : null;
      return { start, end };
    }
  }
  return { start: null, end: null };
}
function hash(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = (h << 5) + h + str.charCodeAt(i) >>> 0;
  return h.toString(36);
}
function buildDedupKey(c) {
  if (c.sourceUid) return `${c.source}:${c.sourceUid}`;
  return `${c.source}:${hash(`${norm(c.title)}|${c.start ?? ""}|${norm(c.city ?? "")}`)}`;
}
function normalize(c, now = /* @__PURE__ */ new Date()) {
  const title = c.title.trim().replace(/\s+/g, " ");
  const { start, end } = parseDates(c.dateText, now);
  const event_type = classifyEventType(title);
  const audience = event_type === "tournament" ? classifyAudience(title, c.ageText) : "all";
  return {
    event_type,
    audience,
    title,
    organizer: c.organizer?.trim() || null,
    city: c.city?.trim() || null,
    country: c.country?.trim() || null,
    venue: c.venue?.trim() || null,
    start_date: start,
    end_date: end,
    reg_deadline: null,
    age_categories: c.ageText?.trim() || null,
    disciplines: null,
    price: c.priceText?.trim() || null,
    url: c.url?.trim() || null,
    image: c.image?.trim() || null,
    source: c.source,
    source_uid: c.sourceUid ?? null,
    dedup_key: buildDedupKey({ source: c.source, sourceUid: c.sourceUid, title, start, city: c.city }),
    raw: c.raw ?? null
  };
}
var decodeEntities = (s) => s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&laquo;/g, "\xAB").replace(/&raquo;/g, "\xBB").replace(/&nbsp;/g, " ").replace(/&mdash;/g, "\u2014").replace(/&ndash;/g, "\u2013").replace(/&gt;/g, ">").replace(/&lt;/g, "<");
var metaContent = (html, prop) => {
  const re = new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']+)["']`, "i");
  const m = html.match(re) || html.match(
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${prop}["']`, "i")
  );
  return m ? decodeEntities(m[1]) : void 0;
};
var pageTitle = (html) => {
  const og = metaContent(html, "og:title");
  if (og) return og;
  const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return m ? decodeEntities(m[1].trim()) : void 0;
};
function extractHrefs(html, pattern) {
  const out = /* @__PURE__ */ new Set();
  for (const m of html.matchAll(pattern)) out.add(m[1]);
  return [...out];
}
var PER_REQUEST_TIMEOUT_MS = 12e3;
async function safeFetchText(ctx, url, stat) {
  let timeout = PER_REQUEST_TIMEOUT_MS;
  if (ctx.deadlineMs) timeout = Math.min(timeout, ctx.deadlineMs - Date.now());
  if (timeout <= 0) {
    ctx.log(`  ${url} \u2192 \u043F\u0440\u043E\u043F\u0443\u0441\u043A: \u0434\u0435\u0434\u043B\u0430\u0439\u043D \u0438\u0441\u0442\u0451\u043A`);
    if (stat) stat.fetchErrors++;
    return null;
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await ctx.fetchFn(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "ru,en;q=0.8"
      }
    });
    if (!res.ok) {
      ctx.log(`  ${url} \u2192 HTTP ${res.status}`);
      if (stat) stat.fetchErrors++;
      return null;
    }
    return await res.text();
  } catch (e) {
    const msg = e?.name === "AbortError" ? `\u0442\u0430\u0439\u043C\u0430\u0443\u0442 ${timeout}ms` : e?.message || e;
    ctx.log(`  ${url} \u2192 \u043E\u0448\u0438\u0431\u043A\u0430: ${msg}`);
    if (stat) stat.fetchErrors++;
    return null;
  } finally {
    clearTimeout(timer);
  }
}
var slugOf = (url) => url.split("?")[0].split("/").filter(Boolean).pop() || "";
function proxiedFetch(base = fetch) {
  const key = process.env.SCRAPER_API_KEY;
  const template = process.env.SCRAPER_API_URL;
  const provider = (process.env.SCRAPER_PROVIDER || "scraperapi").toLowerCase();
  const render = process.env.SCRAPER_RENDER === "true";
  if (!key && !template) return base;
  return (async (input, init) => {
    const target = typeof input === "string" ? input : input?.url ?? String(input);
    let wrapped;
    if (template) {
      wrapped = template.replace("{url}", encodeURIComponent(target)).replace("{key}", key || "");
    } else if (provider === "scrapingbee") {
      wrapped = `https://app.scrapingbee.com/api/v1/?api_key=${key}&render_js=${render}&url=${encodeURIComponent(target)}`;
    } else {
      wrapped = `https://api.scraperapi.com/?api_key=${key}&url=${encodeURIComponent(target)}${render ? "&render=true" : ""}`;
    }
    return base(wrapped, init);
  });
}
var TICKETON_CITIES = [
  { slug: "almaty", city: "\u0410\u043B\u043C\u0430\u0442\u044B", country: "KZ" },
  { slug: "astana", city: "\u0410\u0441\u0442\u0430\u043D\u0430", country: "KZ" },
  { slug: "shymkent", city: "\u0428\u044B\u043C\u043A\u0435\u043D\u0442", country: "KZ" },
  { slug: "karaganda", city: "\u041A\u0430\u0440\u0430\u0433\u0430\u043D\u0434\u0430", country: "KZ" },
  { slug: "atyrau", city: "\u0410\u0442\u044B\u0440\u0430\u0443", country: "KZ" },
  { slug: "aktobe", city: "\u0410\u043A\u0442\u043E\u0431\u0435", country: "KZ" },
  { slug: "bishkek", city: "\u0411\u0438\u0448\u043A\u0435\u043A", country: "KG" },
  { slug: "tashkent", city: "\u0422\u0430\u0448\u043A\u0435\u043D\u0442", country: "UZ" },
  { slug: "dushanbe", city: "\u0414\u0443\u0448\u0430\u043D\u0431\u0435", country: "TJ" }
];
function ticketonAdapter(opts) {
  const cities = opts?.cities ?? TICKETON_CITIES;
  return {
    name: "ticketon",
    enabled: true,
    applyCaucasusFilter: true,
    async run(ctx) {
      const found = [];
      const d = dbg(ctx, "ticketon");
      let detailBudget = ctx.maxDetailFetches;
      for (const c of cities) {
        if (past(ctx)) {
          ctx.log("ticketon: \u0434\u0435\u0434\u043B\u0430\u0439\u043D");
          break;
        }
        for (const page of ["", "?page=2"]) {
          if (past(ctx)) break;
          const listUrl = `https://ticketon.kz/${c.slug}/concerts${page}`;
          const html = await safeFetchText(ctx, listUrl, d);
          if (!html) continue;
          const hrefs = extractHrefs(html, /href=["'](\/[a-z-]+\/event\/[^"'?#]+|\/promo\/[^"'?#]+)["']/gi);
          const candidates = hrefs.filter((h) => CAUCASUS_KEYWORDS_TRANSLIT.some((m) => h.toLowerCase().includes(m)));
          if (d) {
            d.links += hrefs.length;
            d.prefiltered += candidates.length;
          }
          ctx.log(`ticketon ${c.slug}${page}: \u0441\u0441\u044B\u043B\u043E\u043A ${hrefs.length}, \u043A\u0430\u043D\u0434\u0438\u0434\u0430\u0442\u043E\u0432 ${candidates.length}`);
          for (const href of candidates) {
            if (detailBudget-- <= 0) {
              ctx.log("ticketon: \u043B\u0438\u043C\u0438\u0442 detail-\u0437\u0430\u043F\u0440\u043E\u0441\u043E\u0432");
              break;
            }
            const url = href.startsWith("http") ? href : `https://ticketon.kz${href}`;
            const detail = await safeFetchText(ctx, url, d);
            if (!detail) continue;
            const title = pageTitle(detail) || slugOf(href).replace(/-/g, " ");
            if (!isCaucasian(title, href)) continue;
            const priceM = detail.match(/[Оо]т\s*([\d\s]+)\s*₸/);
            const dateM = detail.match(/(\d{1,2}\s+[а-яё]+)(?:\s*,?\s*\d{1,2}:\d{2})?/i);
            found.push({
              title,
              url,
              source: "ticketon",
              sourceUid: slugOf(href),
              city: c.city,
              country: c.country,
              dateText: dateM?.[1],
              priceText: priceM ? `\u043E\u0442 ${priceM[1].replace(/\s+/g, " ").trim()} \u20B8` : void 0,
              image: metaContent(detail, "og:image"),
              ageText: (title.match(/\b(\d{1,2}\+)\b/) || [])[1],
              raw: { href, listUrl }
            });
          }
        }
      }
      return found;
    }
  };
}
var KASSIR_CITIES = [
  { sub: "msk", city: "\u041C\u043E\u0441\u043A\u0432\u0430", country: "RU" },
  { sub: "spb", city: "\u0421\u0430\u043D\u043A\u0442-\u041F\u0435\u0442\u0435\u0440\u0431\u0443\u0440\u0433", country: "RU" }
];
function kassirAdapter(opts) {
  const cities = opts?.cities ?? KASSIR_CITIES;
  return {
    name: "kassir",
    enabled: true,
    applyCaucasusFilter: true,
    async run(ctx) {
      const found = [];
      const d = dbg(ctx, "kassir");
      let detailBudget = ctx.maxDetailFetches;
      for (const c of cities) {
        if (past(ctx)) {
          ctx.log("kassir: \u0434\u0435\u0434\u043B\u0430\u0439\u043D");
          break;
        }
        const base = `https://${c.sub}.kassir.ru`;
        for (const sect of ["/bilety-na-koncert"]) {
          if (past(ctx)) break;
          const html = await safeFetchText(ctx, base + sect, d);
          if (!html) continue;
          const hrefs = extractHrefs(html, /href=["']([^"']*\/(?:koncert|shou)\/[^"'?#]+)["']/gi);
          const candidates = hrefs.filter((h) => CAUCASUS_KEYWORDS_TRANSLIT.some((m) => h.toLowerCase().includes(m)));
          if (d) {
            d.links += hrefs.length;
            d.prefiltered += candidates.length;
          }
          ctx.log(`kassir ${c.sub}${sect}: \u0441\u0441\u044B\u043B\u043E\u043A ${hrefs.length}, \u043A\u0430\u043D\u0434\u0438\u0434\u0430\u0442\u043E\u0432 ${candidates.length}`);
          for (const href of candidates) {
            if (detailBudget-- <= 0) {
              ctx.log("kassir: \u043B\u0438\u043C\u0438\u0442 detail-\u0437\u0430\u043F\u0440\u043E\u0441\u043E\u0432");
              break;
            }
            const url = href.startsWith("http") ? href : base + href;
            const detail = await safeFetchText(ctx, url, d);
            if (!detail) continue;
            const title = pageTitle(detail) || slugOf(href).replace(/-/g, " ");
            if (!isCaucasian(title, href)) continue;
            const priceM = detail.match(/от\s*([\d\s]+)\s*₽/);
            const dateM = detail.match(/(\d{1,2}\s+[а-яё]+)/i);
            found.push({
              title,
              url,
              source: "kassir",
              sourceUid: slugOf(href),
              city: c.city,
              country: c.country,
              dateText: dateM?.[1],
              priceText: priceM ? `\u043E\u0442 ${priceM[1].replace(/\s+/g, " ").trim()} \u20BD` : void 0,
              image: metaContent(detail, "og:image"),
              ageText: (title.match(/\b(\d{1,2}\+)\b/) || [])[1],
              raw: { href, base, sect }
            });
          }
        }
      }
      return found;
    }
  };
}
var manualSeed = [
  // Пример (раскомментируйте и заполните):
  // {
  //   title: "Кубок Кавказа по кавказским танцам — дети",
  //   url: "https://instagram.com/...",
  //   source: "manual",
  //   sourceUid: "kubok-kavkaza-2026-deti",
  //   dateText: "12-14 сентября",
  //   city: "Махачкала",
  //   country: "RU",
  //   organizer: "Федерация кавказского танца",
  //   ageText: "дети 8-15",
  // },
];
function manualAdapter(seed = manualSeed) {
  return {
    name: "manual",
    enabled: true,
    applyCaucasusFilter: false,
    // в ручной список добавляют уже проверенные события
    async run() {
      return seed;
    }
  };
}
function defaultAdapters() {
  return [ticketonAdapter(), kassirAdapter(), manualAdapter()];
}
async function runParser(options = {}) {
  let adapters = options.adapters ?? defaultAdapters();
  if (options.sources?.length) adapters = adapters.filter((a) => options.sources.includes(a.name));
  const fetchFn = options.fetchFn ?? proxiedFetch(fetch);
  const log = options.log ?? (() => {
  });
  const now = options.now ?? /* @__PURE__ */ new Date();
  const debug = {};
  const ctx = {
    fetchFn,
    log,
    maxDetailFetches: options.maxDetailFetches ?? 40,
    deadlineMs: Date.now() + (options.maxMs ?? 5e4),
    debug
  };
  const result = {
    ok: true,
    bySource: {},
    matched: 0,
    upserted: 0,
    byType: { tournament: 0, concert: 0 },
    events: [],
    errors: [],
    debug
  };
  const seen = /* @__PURE__ */ new Set();
  for (const adapter of adapters) {
    if (!adapter.enabled) continue;
    if (past(ctx)) {
      result.errors.push(`${adapter.name}: \u043F\u0440\u043E\u043F\u0443\u0449\u0435\u043D (\u0434\u0435\u0434\u043B\u0430\u0439\u043D)`);
      continue;
    }
    try {
      const candidates = await adapter.run(ctx);
      result.bySource[adapter.name] = candidates.length;
      for (const c of candidates) {
        if (adapter.applyCaucasusFilter && !isCaucasian(c.title, c.sourceUid || c.url)) continue;
        result.matched++;
        const ev = normalize(c, now);
        if (seen.has(ev.dedup_key)) continue;
        seen.add(ev.dedup_key);
        result.events.push(ev);
        result.byType[ev.event_type]++;
      }
    } catch (e) {
      result.ok = false;
      result.errors.push(`${adapter.name}: ${e?.message || e}`);
      log(`\u0410\u0434\u0430\u043F\u0442\u0435\u0440 ${adapter.name} \u0443\u043F\u0430\u043B: ${e?.message || e}`);
    }
  }
  if (!options.dryRun && result.events.length) {
    try {
      const upsertFn = options.upsert ?? supabaseUpsert;
      result.upserted = await upsertFn(result.events);
    } catch (e) {
      result.ok = false;
      result.errors.push(`upsert: ${e?.message || e}`);
    }
  }
  return result;
}
async function supabaseUpsert(events) {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase \u043D\u0435 \u0441\u043A\u043E\u043D\u0444\u0438\u0433\u0443\u0440\u0438\u0440\u043E\u0432\u0430\u043D");
  const rows = events.map(({ status, ...e }) => ({ ...e, updated_at: (/* @__PURE__ */ new Date()).toISOString() }));
  const res = await fetch(`${url}/rest/v1/dance_events?on_conflict=dedup_key`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=representation"
    },
    body: JSON.stringify(rows)
  });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  return data.length;
}

// server/mvpApi.ts
var JUNIOR_MAX_AGE = 10;
var JUNIOR_TABS = ["\u0413\u043B\u0430\u0432\u043D\u0430\u044F", "\u041D\u0430\u043A\u043B\u0435\u0439\u043A\u0438", "\u0414\u043E\u0441\u0442\u0438\u0436\u0435\u043D\u0438\u044F"];
var SENIOR_TABS = ["\u0413\u043B\u0430\u0432\u043D\u0430\u044F", "\u041D\u0430\u043A\u043B\u0435\u0439\u043A\u0438", "\u0414\u043E\u0441\u0442\u0438\u0436\u0435\u043D\u0438\u044F", "\u041C\u043E\u0439 \u043F\u0443\u0442\u044C", "\u041F\u0430\u0441\u043F\u043E\u0440\u0442", "\u0421\u043E\u043E\u0431\u0449\u0435\u0441\u0442\u0432\u043E", "\u041C\u0430\u0433\u0430\u0437\u0438\u043D", "\u0412\u044B\u0441\u0442\u0443\u043F\u043B\u0435\u043D\u0438\u044F", "\u0412\u0438\u0434\u0435\u043E"];
var accessGrantStaff = ["owner", "branch_manager", "admin"];
var STUDENT_STANDARD_PASSWORD = "12345";
function effectiveAccessLevel(manual, age) {
  if (manual === "junior" || manual === "senior") return manual;
  if (age === null || age === void 0) return "junior";
  const a = Number(age);
  if (!Number.isFinite(a) || a <= 0) return "junior";
  return a <= JUNIOR_MAX_AGE ? "junior" : "senior";
}
function tabsForLevel(level) {
  return level === "junior" ? JUNIOR_TABS : SENIOR_TABS;
}
var studentAccessTokens = /* @__PURE__ */ new Map();
function newAccessToken() {
  const rnd = () => globalThis.crypto?.randomUUID?.() || `${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;
  return `st_${rnd()}${rnd()}`.replace(/-/g, "");
}
var ACCESS_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
function newAccessCode() {
  let s = "";
  for (let i = 0; i < 6; i++) s += ACCESS_CODE_ALPHABET[Math.floor(Math.random() * ACCESS_CODE_ALPHABET.length)];
  return s;
}
function normalizeAccessCode(raw) {
  return String(raw || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12);
}
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
var isPlaceholder = (value) => {
  if (!value) return true;
  const v = value.trim();
  if (v.length < 20) return true;
  return /^(paste|your|changeme|placeholder|<|xxx)/i.test(v);
};
var supabaseEnabled = Boolean(supabaseUrl && supabaseKey && !isPlaceholder(supabaseKey));
function getSession(req) {
  const studentToken = String(req.headers["x-student-token"] || "");
  if (studentToken) {
    const rec = studentAccessTokens.get(studentToken);
    if (rec) {
      return {
        userId: `student-${rec.studentId}`,
        organizationId: orgId2,
        role: "student",
        branchId: rec.branchId,
        dbBranchId: rec.branchId,
        fullName: "\u0423\u0447\u0435\u043D\u0438\u043A",
        studentId: rec.studentId,
        accessLevel: rec.level
      };
    }
  }
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
  if (response.status === 204) return void 0;
  const text = await response.text();
  if (!text) return void 0;
  return JSON.parse(text);
}
var toDate = (value) => value ? value.slice(0, 10) : (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
async function logStatusEvent(session, studentId, toStatus, fromStatus, branchId) {
  if (!supabaseEnabled || !toStatus || toStatus === fromStatus) return;
  try {
    await supabaseFetch("student_status_events", "", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        organization_id: session.organizationId,
        branch_id: branchId || null,
        student_id: studentId,
        from_status: fromStatus || null,
        to_status: toStatus,
        source: "api",
        created_by: session.fullName || session.role
      })
    });
  } catch {
  }
}
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
    tasks: [],
    subscriptionPlans: [],
    leadSources: [],
    groups,
    students,
    waitlist: [],
    announcements: initialAnnouncements,
    payments,
    financeTransactions: initialFinanceTransactions,
    auditLogs: initialAuditLogs,
    metrics: getExecutiveSummary(branchFiltered, groups, students, payments, initialTeachers)
  };
}
function mapDbTask(row, studentNameById) {
  return {
    id: row.id,
    branchId: row.branch_id || null,
    studentId: row.student_id || null,
    studentName: row.student_id ? studentNameById?.get(row.student_id) || null : null,
    assignedTo: row.assigned_to || null,
    title: row.title,
    description: row.description || null,
    status: row.status || "new",
    priority: row.priority || "normal",
    dueAt: row.due_at ? toDate(row.due_at) : null,
    completedAt: row.completed_at || null,
    createdAt: row.created_at || null
  };
}
function mapDbPlan(row) {
  return {
    id: row.id,
    name: row.name,
    lessonsCount: row.lessons_count ?? 0,
    durationDays: row.duration_days ?? 0,
    price: Number(row.price || 0),
    status: row.status || "active"
  };
}
function mapDbLeadSource(row) {
  return { id: row.id, name: row.name, status: row.status || "active" };
}
function mapDbWaitlist(row) {
  return {
    id: row.id,
    studentId: row.student_id,
    branchId: row.branch_id || null,
    groupId: row.group_id || null,
    comment: row.comment || null,
    addedAt: row.added_at,
    removedAt: row.removed_at || null,
    removedReason: row.removed_reason || null
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
    experienceYears: 5,
    branchId: user.branch_id || null,
    role: user.role || "teacher"
  };
}
function deriveStudentStatus(row, subs) {
  if (row.archived_at) return "archived";
  if (row.deletion_requested_at) return "trash";
  const manual = String(row.manual_status || "").trim();
  if (manual) return manual;
  const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  const active = (subs || []).filter((x) => x.status === "active" && (!x.ends_on || String(x.ends_on).slice(0, 10) >= today));
  if (active.length) return "active";
  const everHadSub = (subs || []).some((x) => x.status !== "archived");
  if (everHadSub) return "expired";
  if (row.status === "trial") return "trial";
  return "no_status";
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
    createdAt: row.created_at || void 0,
    status: row.status || void 0,
    manualStatus: row.manual_status || null,
    computedStatus: deriveStudentStatus(row, subsByStudent.get(row.id) || []),
    returned: Boolean(row.returned_at),
    payLater: Boolean(row.pay_later),
    payPromiseDate: row.pay_promise_date || null,
    archivedAt: row.archived_at || null,
    archiveReason: row.archive_reason || null,
    archiveComment: row.archive_comment || null,
    archivedBy: row.archived_by || null,
    gender: row.gender || null,
    birthday: row.birthday || null,
    phone: row.phone || "",
    sourceId: row.source_id || null,
    comment: row.comment || "",
    waitlistAddedAt: row.__waitlist_added_at || null,
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
      status: sub.status === "active" ? "active" : sub.status === "archived" ? "deleted" : "expired",
      startsOn: sub.starts_on,
      discountAmount: Number(sub.discount_amount || 0),
      groupId: sub.group_id || null,
      cancelReason: sub.cancel_reason || null,
      cancelComment: sub.cancel_comment || null,
      deletedBy: sub.deleted_by || null,
      deletedAt: sub.deleted_at || null
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
function mapDbSubscription(row, planName) {
  return {
    id: row.id,
    studentId: row.student_id,
    name: planName || row.plan_name || "\u0410\u0431\u043E\u043D\u0435\u043C\u0435\u043D\u0442",
    price: Number(row.price || 0),
    lessonsTotal: row.lessons_total || 0,
    lessonsLeft: row.lessons_left || 0,
    validUntil: row.ends_on,
    isAutoRenew: false,
    status: row.status === "active" ? "active" : row.status === "archived" ? "deleted" : "expired",
    startsOn: row.starts_on,
    discountAmount: Number(row.discount_amount || 0),
    groupId: row.group_id || null,
    cancelReason: row.cancel_reason || null,
    cancelComment: row.cancel_comment || null,
    deletedBy: row.deleted_by || null,
    deletedAt: row.deleted_at || null
  };
}
async function dbBootstrap(session) {
  const orgFilter = `organization_id=eq.${session.organizationId}`;
  const [branches, halls, users, groups, studentsRaw, paymentsRaw, lessons, attendanceRaw, subscriptionsRaw, plans, financeTransactions, tasksRaw, leadSourcesRaw, waitlistRaw] = await Promise.all([
    supabaseFetch("branches", `select=*&${orgFilter}&status=neq.archived`),
    supabaseFetch("halls", `select=*`),
    // Halls are filtered by branch in mapping
    supabaseFetch("users", `select=*&${orgFilter}`),
    supabaseFetch("groups", `select=*&${orgFilter}`),
    supabaseFetch("students", `select=*&${orgFilter}&status=neq.archived&deletion_requested_at=is.null&archived_at=is.null`),
    supabaseFetch("payments", `select=*&${orgFilter}&order=paid_at.desc`),
    supabaseFetch("schedule_lessons", `select=*&order=starts_at.desc`),
    // Cross-org lessons are unlikely but we keep mapping safe
    supabaseFetch("attendance", "select=*"),
    supabaseFetch("student_subscriptions", `select=*`),
    supabaseFetch("subscription_plans", `select=*&${orgFilter}&status=eq.active`),
    supabaseFetch("finance_transactions", `select=*&${orgFilter}&order=created_at.desc`),
    // tasks/lead_sources не имеют organization_id — фильтруем по филиалу в коде
    supabaseFetch("tasks", `select=*&order=created_at.desc`).catch(() => []),
    supabaseFetch("lead_sources", `select=*&order=name.asc`).catch(() => []),
    // активный лист ожидания (миграция 021); .catch — если миграция ещё не применена
    supabaseFetch("student_waitlist", `select=*&${orgFilter}&removed_at=is.null&order=added_at.asc`).catch(() => [])
  ]);
  const waitlistAddedByStudent = /* @__PURE__ */ new Map();
  waitlistRaw.forEach((w) => {
    if (!waitlistAddedByStudent.has(w.student_id)) waitlistAddedByStudent.set(w.student_id, w.added_at);
  });
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
      note: row.comment || void 0,
      absenceReason: row.absence_reason || null,
      isTrial: Boolean(row.is_trial) || void 0,
      trialOutcome: row.trial_outcome || null
    };
    attendanceByStudent.set(row.student_id, current);
  });
  subscriptionsRaw.forEach((sub) => {
    const plan = planById.get(sub.plan_id);
    const list = subsByStudent.get(sub.student_id) || [];
    list.push({ ...sub, plan_name: plan?.name });
    subsByStudent.set(sub.student_id, list);
  });
  const teacherUsers = users.filter((user) => user.role === "teacher" && user.status !== "archived");
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
    ageFrom: group.age_from ?? null,
    ageTo: group.age_to ?? null,
    capacity: group.capacity ?? 0,
    level: "MVP",
    studentCount: studentsRaw.filter((student) => student.group_id === group.id).length
  }));
  const isOwner = session.role === "owner";
  const branchAllowed = (branchId) => isOwner || branchId === session.dbBranchId;
  const students = studentsRaw.filter((student) => {
    if (isOwner) return true;
    if (session.role === "teacher") {
      const group = groupById.get(student.group_id);
      return group?.teacher_id === session.userId;
    }
    return student.branch_id === session.dbBranchId;
  }).map((student) => {
    const group = groupById.get(student.group_id);
    return mapDbStudent({ ...student, teacher_id: student.teacher_id || group?.teacher_id, __waitlist_added_at: waitlistAddedByStudent.get(student.id) || null }, attendanceByStudent, subsByStudent);
  });
  for (const s of studentsRaw) {
    const next = deriveStudentStatus(s, subsByStudent.get(s.id) || []);
    if (next !== (s.computed_status || null)) {
      supabaseFetch("students", `id=eq.${s.id}&organization_id=eq.${session.organizationId}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ computed_status: next }) }).catch(() => {
      });
    }
  }
  const visibleStudentIds = new Set(students.map((student) => student.id));
  const waitlist = waitlistRaw.filter((w) => visibleStudentIds.has(w.student_id)).map(mapDbWaitlist);
  const payments = paymentsRaw.filter((payment) => visibleStudentIds.has(payment.student_id)).map(mapDbPayment);
  const branchesVisible = branches.filter((branch) => branchAllowed(branch.id)).map((branch) => ({
    id: branch.id,
    organizationId: branch.organization_id,
    name: branch.name,
    city: branch.city,
    address: branch.address,
    managerName: branch.manager_name || users.find((user) => user.id === branch.manager_id)?.full_name || "\u0420\u0443\u043A\u043E\u0432\u043E\u0434\u0438\u0442\u0435\u043B\u044C",
    phone: branch.phone || "",
    comment: branch.comment || "",
    status: branch.status || "active",
    hallsCount: halls.filter((hall) => hall.branch_id === branch.id).length
  }));
  const hallsVisible = halls.filter((hall) => branchAllowed(hall.branch_id)).map((hall) => ({ id: hall.id, branchId: hall.branch_id, name: hall.name, capacity: hall.capacity || 0, description: hall.description || "", status: hall.status || "active" }));
  const groupsVisible = groupsMapped.filter((group) => {
    if (isOwner) return true;
    if (session.role === "teacher") return group.teacherId === session.userId;
    return group.branchId === session.dbBranchId;
  });
  const studentNameById = new Map(
    studentsRaw.map((s) => [s.id, [s.first_name, s.last_name].filter(Boolean).join(" ") || s.full_name || "\u0423\u0447\u0435\u043D\u0438\u043A"])
  );
  const tasks = tasksRaw.filter((task) => isOwner || !task.branch_id || task.branch_id === session.dbBranchId).map((task) => mapDbTask(task, studentNameById));
  const subscriptionPlans = plans.map(mapDbPlan);
  const leadSources = leadSourcesRaw.map(mapDbLeadSource);
  return {
    mode: "supabase",
    session,
    organizations: initialOrganizations,
    branches: branchesVisible,
    halls: hallsVisible,
    teachers,
    tasks,
    subscriptionPlans,
    leadSources,
    groups: groupsVisible,
    students,
    waitlist,
    announcements: initialAnnouncements,
    payments,
    financeTransactions,
    auditLogs: initialAuditLogs,
    metrics: getExecutiveSummary(branchesVisible, groupsVisible, students, payments, teachers)
  };
}
async function upsertAttendanceRows(rows) {
  if (rows.length === 0) return [];
  const opts = (body) => ({
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify(body)
  });
  try {
    return await supabaseFetch("attendance", "on_conflict=lesson_id,student_id", opts(rows));
  } catch (error) {
    const base = rows.map(({ absence_reason, is_trial, trial_outcome, ...rest }) => rest);
    return await supabaseFetch("attendance", "on_conflict=lesson_id,student_id", opts(base));
  }
}
function hasActiveSubscription(subs, todayStr) {
  return subs.some(
    (s) => s.status === "active" && ((Number(s.lessons_left) || 0) > 0 || s.ends_on && String(s.ends_on) >= todayStr)
  );
}
function emptyJournalDashboard(from, to) {
  return {
    rangeFrom: from,
    rangeTo: to,
    visited: { count: 0, studentIds: [] },
    unpaid: { count: 0, studentIds: [] },
    trialNotBought: { count: 0, studentIds: [] },
    trialBought: { count: 0, studentIds: [] },
    openJournals: []
  };
}
function mapDbRecalc(row, studentName) {
  return {
    id: row.id,
    organizationId: row.organization_id,
    branchId: row.branch_id || null,
    studentId: row.student_id,
    studentName: studentName || row.student_name || void 0,
    subscriptionId: row.subscription_id || null,
    periodFrom: row.period_from || null,
    periodTo: row.period_to || null,
    lessonsCount: Number(row.lessons_count || 0),
    reason: row.reason || null,
    amount: Number(row.amount || 0),
    comment: row.comment || null,
    attachmentUrl: row.attachment_url || null,
    attachmentName: row.attachment_name || null,
    status: row.status || "pending",
    createdByName: row.created_by_name || null,
    createdAt: row.created_at || null,
    appliedAt: row.applied_at || null
  };
}
function registerMvpApi(app2) {
  const PUBLIC_MVP_PATHS = /* @__PURE__ */ new Set([
    "/session/demo-users",
    "/session/demo-login",
    "/student-auth"
  ]);
  app2.use("/api/mvp", (req, res, next) => {
    if (PUBLIC_MVP_PATHS.has(req.path)) return next();
    const hasRole = Boolean(req.headers["x-demo-role"]);
    const hasStudentToken = Boolean(req.headers["x-student-token"]);
    if (!hasRole && !hasStudentToken) {
      return res.status(401).json({ error: "\u041D\u0435 \u0430\u0432\u0442\u043E\u0440\u0438\u0437\u043E\u0432\u0430\u043D\u043E: \u0443\u043A\u0430\u0436\u0438\u0442\u0435 \u0440\u043E\u043B\u044C \u0438\u043B\u0438 \u0432\u043E\u0439\u0434\u0438\u0442\u0435 \u043A\u0430\u043A \u0443\u0447\u0435\u043D\u0438\u043A" });
    }
    return next();
  });
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  app2.use("/api/mvp", (req, res, next) => {
    if (req.method === "GET") return next();
    res.on("finish", () => {
      try {
        const session = getSession(req);
        const parts = req.path.split("/").filter(Boolean);
        const entityType = parts[0] || "unknown";
        const maybeId = parts.find((p) => UUID_RE.test(p)) || null;
        const record = {
          actor_id: null,
          branch_id: null,
          entity_type: entityType,
          entity_id: maybeId,
          action: req.method,
          after_data: {
            path: req.originalUrl,
            status: res.statusCode,
            role: session.role,
            user: session.fullName || null,
            body: req.body && Object.keys(req.body).length ? JSON.stringify(req.body).slice(0, 1e3) : null
          },
          ip_address: req.ip || null,
          user_agent: String(req.headers["user-agent"] || "").slice(0, 300) || null
        };
        if (supabaseEnabled) {
          supabaseFetch("audit_logs", "", { method: "POST", body: JSON.stringify(record) }).catch((e) => console.warn("[audit] \u043D\u0435 \u0437\u0430\u043F\u0438\u0441\u0430\u043D:", e?.message || e));
        } else {
          console.log(`[audit] ${record.action} ${record.after_data.path} \xB7 ${record.after_data.role} \xB7 HTTP ${record.after_data.status}`);
        }
      } catch (e) {
        console.warn("[audit] \u043E\u0448\u0438\u0431\u043A\u0430 \u0444\u043E\u0440\u043C\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u044F \u0437\u0430\u043F\u0438\u0441\u0438:", e?.message || e);
      }
    });
    return next();
  });
  const ah = (fn) => (req, res) => {
    Promise.resolve(fn(req, res)).catch((error) => {
      console.error("[mvpApi] \u041E\u0448\u0438\u0431\u043A\u0430 \u043E\u0431\u0440\u0430\u0431\u043E\u0442\u0447\u0438\u043A\u0430:", error?.message || error);
      if (!res.headersSent) {
        res.status(500).json({ error: error?.message || "\u0412\u043D\u0443\u0442\u0440\u0435\u043D\u043D\u044F\u044F \u043E\u0448\u0438\u0431\u043A\u0430 \u0441\u0435\u0440\u0432\u0435\u0440\u0430" });
      }
    });
  };
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
  app2.get("/api/mvp/owner/extras", async (req, res) => {
    const session = getSession(req);
    if (session.role !== "owner") return res.status(403).json({ error: "\u0422\u043E\u043B\u044C\u043A\u043E \u0432\u043B\u0430\u0434\u0435\u043B\u0435\u0446" });
    if (!supabaseEnabled) return res.json({ snapshots: [], funnelToday: null, funnelYesterday: null });
    try {
      const orgFilter = `organization_id=eq.${session.organizationId}`;
      const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
      const yesterday = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
      const dayStart = (d) => `${d}T00:00:00`;
      const dayEnd = (d) => `${d}T23:59:59`;
      const [snapsRaw, evToday, evYest, invoicesRaw, futureSubs, studentsLite] = await Promise.all([
        supabaseFetch("metrics_snapshots", `select=*&${orgFilter}&order=period_month.asc`),
        supabaseFetch("student_status_events", `select=to_status&${orgFilter}&occurred_at=gte.${dayStart(today)}&occurred_at=lte.${dayEnd(today)}`),
        supabaseFetch("student_status_events", `select=to_status&${orgFilter}&occurred_at=gte.${dayStart(yesterday)}&occurred_at=lte.${dayEnd(yesterday)}`),
        supabaseFetch("invoices", `select=due_on,status&${orgFilter}&due_on=lt.${today}&status=in.(sent,overdue)`),
        supabaseFetch("student_subscriptions", `select=student_id,branch_id,starts_on&starts_on=gt.${today}`),
        supabaseFetch("students", `select=id,branch_id,birthday&${orgFilter}&status=neq.archived&archived_at=is.null`)
      ]);
      const snapshots = snapsRaw.map((s) => ({
        periodMonth: toDate(s.period_month),
        branchId: s.branch_id,
        revenue: Number(s.revenue || 0),
        activeSubscriptions: s.active_subscriptions || 0,
        avgCheck: Number(s.avg_check || 0),
        retentionRate: Number(s.retention_rate || 0),
        attendanceRate: Number(s.attendance_rate || 0),
        newStudents: s.new_students || 0
      }));
      const funnel = (rows) => ({
        leads: rows.filter((r) => r.to_status === "lead").length,
        trialBooked: rows.filter((r) => r.to_status === "trial").length,
        trialCame: rows.filter((r) => r.to_status === "trial").length,
        bought: rows.filter((r) => r.to_status === "active").length
      });
      const ageDays = (d) => Math.floor((Date.now() - new Date(d).getTime()) / 864e5);
      let debtorAging = null;
      if (invoicesRaw.length) {
        debtorAging = { d1_7: 0, d8_14: 0, d14plus: 0 };
        invoicesRaw.forEach((inv) => {
          if (!inv.due_on) return;
          const a = ageDays(inv.due_on);
          if (a >= 1 && a <= 7) debtorAging.d1_7 += 1;
          else if (a >= 8 && a <= 14) debtorAging.d8_14 += 1;
          else if (a > 14) debtorAging.d14plus += 1;
        });
      }
      let futureEnrollments = null;
      if (futureSubs.length) {
        const stById = new Map(studentsLite.map((s) => [s.id, s]));
        const ageOf = (bd) => bd ? Math.max(0, (/* @__PURE__ */ new Date()).getFullYear() - new Date(bd).getFullYear()) : null;
        const bucket = (a) => a === null ? "\u2014" : a <= 6 ? "\u0434\u043E 6" : a <= 9 ? "7\u20139" : a <= 12 ? "10\u201312" : a <= 15 ? "13\u201315" : "16+";
        const byBranch = {};
        const byAge = {};
        futureSubs.forEach((sub) => {
          const st = stById.get(sub.student_id);
          const br = sub.branch_id || st?.branch_id;
          if (br) byBranch[br] = (byBranch[br] || 0) + 1;
          const b = bucket(ageOf(st?.birthday));
          byAge[b] = (byAge[b] || 0) + 1;
        });
        futureEnrollments = { total: futureSubs.length, byBranch, byAge };
      }
      res.json({ snapshots, funnelToday: funnel(evToday), funnelYesterday: funnel(evYest), debtorAging, futureEnrollments });
    } catch (error) {
      res.status(503).json({ snapshots: [], funnelToday: null, funnelYesterday: null, error: error.message });
    }
  });
  app2.post("/api/mvp/owner/snapshot", async (req, res) => {
    const session = getSession(req);
    if (session.role !== "owner") return res.status(403).json({ error: "\u0422\u043E\u043B\u044C\u043A\u043E \u0432\u043B\u0430\u0434\u0435\u043B\u0435\u0446" });
    if (!supabaseEnabled) return res.status(503).json({ error: "Supabase is not configured" });
    try {
      const orgFilter = `organization_id=eq.${session.organizationId}`;
      const now = /* @__PURE__ */ new Date();
      const monthPrefix = now.toISOString().slice(0, 7);
      const periodMonth = `${monthPrefix}-01`;
      const [branches, students, payments, subs] = await Promise.all([
        supabaseFetch("branches", `select=id&${orgFilter}&status=neq.archived`),
        supabaseFetch("students", `select=id,branch_id,status,computed_status,created_at&${orgFilter}&status=neq.archived&archived_at=is.null`),
        supabaseFetch("payments", `select=amount,branch_id,paid_at,status&${orgFilter}`),
        supabaseFetch("student_subscriptions", `select=branch_id,status`)
      ]);
      const paidThisMonth = payments.filter((p) => p.status === "paid" && String(p.paid_at || "").slice(0, 7) === monthPrefix);
      const build = (branchId) => {
        const bs = branchId ? students.filter((s) => s.branch_id === branchId) : students;
        const bp = branchId ? paidThisMonth.filter((p) => p.branch_id === branchId) : paidThisMonth;
        const bsub = branchId ? subs.filter((s) => s.branch_id === branchId) : subs;
        const revenue = bp.reduce((s, p) => s + Number(p.amount || 0), 0);
        const activeSubs = bsub.filter((s) => s.status === "active").length;
        const activeStud = bs.filter((s) => (s.computed_status || s.status) === "active").length;
        return {
          organization_id: session.organizationId,
          branch_id: branchId,
          period_month: periodMonth,
          revenue,
          active_students: activeStud,
          active_subscriptions: activeSubs,
          avg_check: bp.length ? Math.round(revenue / bp.length) : 0,
          retention_rate: bs.length ? Math.round(activeStud / bs.length * 100) : 0,
          attendance_rate: 0,
          new_students: bs.filter((s) => String(s.created_at || "").slice(0, 7) === monthPrefix).length,
          payments_count: bp.length,
          computed_at: now.toISOString()
        };
      };
      const rows = [build(null), ...branches.map((b) => build(b.id))];
      await supabaseFetch("metrics_snapshots", `organization_id=eq.${session.organizationId}&period_month=eq.${periodMonth}`, {
        method: "DELETE",
        headers: { Prefer: "return=minimal" }
      });
      await supabaseFetch("metrics_snapshots", "", {
        method: "POST",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify(rows)
      });
      res.json({ ok: true, written: rows.length, periodMonth });
    } catch (error) {
      res.json({ ok: false, skipped: true, error: error?.message });
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
  app2.post("/api/mvp/students", ah(async (req, res) => {
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
    const [splitFirst, ...splitRest] = String(payload.name).trim().split(/\s+/);
    const firstName = payload.firstName || splitFirst || payload.name;
    const lastName = payload.lastName || splitRest.join(" ") || "-";
    const inserted = await supabaseFetch("students", "", {
      method: "POST",
      body: JSON.stringify({
        organization_id: session.organizationId,
        branch_id: payload.branchId,
        group_id: payload.groupId || null,
        source_id: payload.sourceId || null,
        first_name: firstName,
        last_name: lastName,
        gender: payload.gender || null,
        birthday: payload.birthday || null,
        phone: payload.phone || null,
        teacher_id: payload.teacherId || null,
        parent_name: payload.parentName || null,
        parent_phone: payload.parentPhone || null,
        status: payload.status || "lead",
        manual_status: payload.manualStatus || null,
        comment: payload.comment || null
      })
    });
    await logStatusEvent(session, inserted[0]?.id, inserted[0]?.status, null, payload.branchId);
    res.status(201).json({ student: inserted[0] });
  }));
  app2.patch("/api/mvp/students/:id", async (req, res) => {
    const session = getSession(req);
    const payload = req.body || {};
    if (!supabaseEnabled) {
      return res.status(503).json({ error: "Supabase is not configured" });
    }
    if (payload.branchId && !canSeeBranch(session, payload.branchId)) {
      return res.status(403).json({ error: "Branch access denied" });
    }
    const updates = {};
    if (payload.firstName !== void 0 || payload.lastName !== void 0) {
      if (payload.firstName !== void 0) updates.first_name = payload.firstName || "-";
      if (payload.lastName !== void 0) updates.last_name = payload.lastName || "-";
    } else if (payload.name !== void 0) {
      const [firstName, ...rest] = String(payload.name).trim().split(/\s+/);
      updates.first_name = firstName || payload.name;
      updates.last_name = rest.join(" ") || "-";
    }
    if (payload.branchId !== void 0) updates.branch_id = payload.branchId;
    if (payload.groupId !== void 0) updates.group_id = payload.groupId || null;
    if (payload.sourceId !== void 0) updates.source_id = payload.sourceId || null;
    if (payload.teacherId !== void 0) updates.teacher_id = payload.teacherId || null;
    if (payload.gender !== void 0) updates.gender = payload.gender || null;
    if (payload.birthday !== void 0) updates.birthday = payload.birthday || null;
    if (payload.phone !== void 0) updates.phone = payload.phone || null;
    if (payload.parentName !== void 0) updates.parent_name = payload.parentName || null;
    if (payload.parentPhone !== void 0) updates.parent_phone = payload.parentPhone || null;
    if (payload.comment !== void 0) updates.comment = payload.comment || null;
    if (payload.status !== void 0) updates.status = payload.status;
    if (payload.manualStatus !== void 0) updates.manual_status = payload.manualStatus || null;
    if (payload.payPromiseDate !== void 0) updates.pay_promise_date = payload.payPromiseDate || null;
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "\u041D\u0435\u0442 \u043F\u043E\u043B\u0435\u0439 \u0434\u043B\u044F \u043E\u0431\u043D\u043E\u0432\u043B\u0435\u043D\u0438\u044F" });
    }
    try {
      let prevStatus;
      if (payload.status !== void 0) {
        const before = await supabaseFetch("students", `select=status,branch_id&id=eq.${req.params.id}&organization_id=eq.${session.organizationId}`);
        prevStatus = before[0]?.status;
      }
      const rows = await supabaseFetch(
        "students",
        `id=eq.${req.params.id}&organization_id=eq.${session.organizationId}`,
        { method: "PATCH", body: JSON.stringify(updates) }
      );
      if (!rows[0]) return res.status(404).json({ error: "\u0423\u0447\u0435\u043D\u0438\u043A \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D" });
      if (payload.status !== void 0) await logStatusEvent(session, rows[0].id, rows[0].status, prevStatus, rows[0].branch_id);
      res.json({ student: rows[0] });
    } catch (error) {
      res.status(400).json({ error: error.message || "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043E\u0431\u043D\u043E\u0432\u0438\u0442\u044C \u0443\u0447\u0435\u043D\u0438\u043A\u0430" });
    }
  });
  app2.delete("/api/mvp/students/:id", async (req, res) => {
    const session = getSession(req);
    if (!supabaseEnabled) {
      return res.status(503).json({ error: "Supabase is not configured" });
    }
    try {
      const existing = await supabaseFetch(
        "students",
        `select=id,branch_id&id=eq.${req.params.id}&organization_id=eq.${session.organizationId}`
      );
      if (!existing[0]) return res.status(404).json({ error: "\u0423\u0447\u0435\u043D\u0438\u043A \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D" });
      if (!canSeeBranch(session, existing[0].branch_id)) {
        return res.status(403).json({ error: "Branch access denied" });
      }
      const requestedBy = { owner: "\u0412\u043B\u0430\u0434\u0435\u043B\u0435\u0446", branch_manager: "\u0420\u0443\u043A\u043E\u0432\u043E\u0434\u0438\u0442\u0435\u043B\u044C \u0444\u0438\u043B\u0438\u0430\u043B\u0430", admin: "\u0410\u0434\u043C\u0438\u043D\u0438\u0441\u0442\u0440\u0430\u0442\u043E\u0440", teacher: "\u041F\u0440\u0435\u043F\u043E\u0434\u0430\u0432\u0430\u0442\u0435\u043B\u044C" }[session.role] || session.role;
      const rows = await supabaseFetch(
        "students",
        `id=eq.${req.params.id}&organization_id=eq.${session.organizationId}`,
        { method: "PATCH", body: JSON.stringify({
          deletion_requested_at: (/* @__PURE__ */ new Date()).toISOString(),
          deletion_requested_by: requestedBy,
          deletion_reason: req.body && req.body.reason || null
        }) }
      );
      res.json({ student: rows[0], trashed: true });
    } catch (error) {
      res.status(400).json({ error: error.message || "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043F\u0435\u0440\u0435\u043C\u0435\u0441\u0442\u0438\u0442\u044C \u0443\u0447\u0435\u043D\u0438\u043A\u0430 \u0432 \u043A\u043E\u0440\u0437\u0438\u043D\u0443" });
    }
  });
  app2.post("/api/mvp/waitlist", async (req, res) => {
    const session = getSession(req);
    const payload = req.body || {};
    if (!payload.studentId) return res.status(400).json({ error: "studentId is required" });
    if (!supabaseEnabled) return res.status(503).json({ error: "Supabase is not configured" });
    if (payload.branchId && !canSeeBranch(session, payload.branchId)) {
      return res.status(403).json({ error: "Branch access denied" });
    }
    try {
      const existing = await supabaseFetch(
        "student_waitlist",
        `select=id&${`organization_id=eq.${session.organizationId}`}&student_id=eq.${payload.studentId}&removed_at=is.null`
      );
      const body = {
        organization_id: session.organizationId,
        student_id: payload.studentId,
        branch_id: payload.branchId || null,
        group_id: payload.groupId || null,
        comment: payload.comment || null
      };
      let rows;
      if (existing[0]) {
        rows = await supabaseFetch(
          "student_waitlist",
          `id=eq.${existing[0].id}`,
          { method: "PATCH", body: JSON.stringify({ branch_id: body.branch_id, group_id: body.group_id, comment: body.comment }) }
        );
      } else {
        rows = await supabaseFetch("student_waitlist", "", { method: "POST", body: JSON.stringify(body) });
      }
      res.status(201).json({ entry: mapDbWaitlist(rows[0]) });
    } catch (error) {
      res.status(400).json({ error: error.message || "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0434\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u0432 \u043B\u0438\u0441\u0442 \u043E\u0436\u0438\u0434\u0430\u043D\u0438\u044F" });
    }
  });
  app2.delete("/api/mvp/waitlist/:id", async (req, res) => {
    const session = getSession(req);
    if (!supabaseEnabled) return res.status(503).json({ error: "Supabase is not configured" });
    try {
      const reason = req.body && req.body.reason || "manual";
      const rows = await supabaseFetch(
        "student_waitlist",
        `id=eq.${req.params.id}&organization_id=eq.${session.organizationId}&removed_at=is.null`,
        { method: "PATCH", body: JSON.stringify({ removed_at: (/* @__PURE__ */ new Date()).toISOString(), removed_reason: reason }) }
      );
      res.json({ entry: rows[0] ? mapDbWaitlist(rows[0]) : null, removed: true });
    } catch (error) {
      res.status(400).json({ error: error.message || "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0443\u0431\u0440\u0430\u0442\u044C \u0438\u0437 \u043B\u0438\u0441\u0442\u0430 \u043E\u0436\u0438\u0434\u0430\u043D\u0438\u044F" });
    }
  });
  app2.get("/api/mvp/students/trash", async (req, res) => {
    const session = getSession(req);
    if (session.role !== "owner") {
      return res.status(403).json({ error: "\u0422\u043E\u043B\u044C\u043A\u043E \u0432\u043B\u0430\u0434\u0435\u043B\u0435\u0446 \u0432\u0438\u0434\u0438\u0442 \u043A\u043E\u0440\u0437\u0438\u043D\u0443 \u0443\u0447\u0435\u043D\u0438\u043A\u043E\u0432" });
    }
    if (!supabaseEnabled) {
      return res.status(503).json({ error: "Supabase is not configured" });
    }
    try {
      const rows = await supabaseFetch(
        "students",
        `select=*&organization_id=eq.${session.organizationId}&status=neq.archived&deletion_requested_at=not.is.null&order=deletion_requested_at.desc`
      );
      const students = rows.map((row) => ({
        id: row.id,
        name: [row.first_name, row.last_name].filter(Boolean).join(" ") || row.full_name || "\u0423\u0447\u0435\u043D\u0438\u043A",
        branchId: row.branch_id,
        parentName: row.parent_name || "",
        parentPhone: row.parent_phone || "",
        requestedBy: row.deletion_requested_by || "\u2014",
        requestedAt: row.deletion_requested_at,
        reason: row.deletion_reason || ""
      }));
      res.json({ students });
    } catch (error) {
      res.status(400).json({ error: error.message || "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C \u043A\u043E\u0440\u0437\u0438\u043D\u0443" });
    }
  });
  app2.post("/api/mvp/students/:id/restore", async (req, res) => {
    const session = getSession(req);
    if (session.role !== "owner") {
      return res.status(403).json({ error: "\u0422\u043E\u043B\u044C\u043A\u043E \u0432\u043B\u0430\u0434\u0435\u043B\u0435\u0446 \u043C\u043E\u0436\u0435\u0442 \u0432\u043E\u0441\u0441\u0442\u0430\u043D\u0430\u0432\u043B\u0438\u0432\u0430\u0442\u044C \u0443\u0447\u0435\u043D\u0438\u043A\u043E\u0432" });
    }
    if (!supabaseEnabled) {
      return res.status(503).json({ error: "Supabase is not configured" });
    }
    try {
      const rows = await supabaseFetch(
        "students",
        `id=eq.${req.params.id}&organization_id=eq.${session.organizationId}`,
        { method: "PATCH", body: JSON.stringify({ deletion_requested_at: null, deletion_requested_by: null, deletion_reason: null }) }
      );
      if (!rows[0]) return res.status(404).json({ error: "\u0423\u0447\u0435\u043D\u0438\u043A \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D" });
      res.json({ student: rows[0], restored: true });
    } catch (error) {
      res.status(400).json({ error: error.message || "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0432\u043E\u0441\u0441\u0442\u0430\u043D\u043E\u0432\u0438\u0442\u044C \u0443\u0447\u0435\u043D\u0438\u043A\u0430" });
    }
  });
  app2.post("/api/mvp/students/:id/confirm-delete", async (req, res) => {
    const session = getSession(req);
    if (session.role !== "owner") {
      return res.status(403).json({ error: "\u0422\u043E\u043B\u044C\u043A\u043E \u0432\u043B\u0430\u0434\u0435\u043B\u0435\u0446 \u043C\u043E\u0436\u0435\u0442 \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u044C \u0443\u0434\u0430\u043B\u0435\u043D\u0438\u0435" });
    }
    if (!supabaseEnabled) {
      return res.status(503).json({ error: "Supabase is not configured" });
    }
    try {
      const rows = await supabaseFetch(
        "students",
        `id=eq.${req.params.id}&organization_id=eq.${session.organizationId}`,
        { method: "PATCH", body: JSON.stringify({ status: "archived", deletion_requested_at: null }) }
      );
      if (!rows[0]) return res.status(404).json({ error: "\u0423\u0447\u0435\u043D\u0438\u043A \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D" });
      res.json({ student: rows[0], archived: true });
    } catch (error) {
      res.status(400).json({ error: error.message || "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0443\u0434\u0430\u043B\u0438\u0442\u044C \u0443\u0447\u0435\u043D\u0438\u043A\u0430" });
    }
  });
  app2.patch("/api/mvp/students/:id/archive", ah(async (req, res) => {
    const session = getSession(req);
    if (!supabaseEnabled) return res.status(503).json({ error: "Supabase is not configured" });
    const existing = await supabaseFetch(
      "students",
      `select=id,branch_id,archived_at&id=eq.${req.params.id}&organization_id=eq.${session.organizationId}`
    );
    if (!existing[0]) return res.status(404).json({ error: "\u0423\u0447\u0435\u043D\u0438\u043A \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D" });
    if (!existing[0].archived_at) return res.status(400).json({ error: "\u0423\u0447\u0435\u043D\u0438\u043A \u043D\u0435 \u0432 \u0430\u0440\u0445\u0438\u0432\u0435" });
    if (!canSeeBranch(session, existing[0].branch_id)) return res.status(403).json({ error: "Branch access denied" });
    const patch = {};
    if (req.body?.leftOn !== void 0) patch.left_on = req.body.leftOn ? String(req.body.leftOn).slice(0, 10) : null;
    if (req.body?.reason !== void 0) patch.archive_reason = String(req.body.reason || "").trim();
    if (req.body?.comment !== void 0) patch.archive_comment = String(req.body.comment || "").trim();
    if (!Object.keys(patch).length) return res.status(400).json({ error: "\u041D\u0435\u0442 \u043F\u043E\u043B\u0435\u0439 \u0434\u043B\u044F \u043E\u0431\u043D\u043E\u0432\u043B\u0435\u043D\u0438\u044F" });
    const rows = await supabaseFetch(
      "students",
      `id=eq.${req.params.id}&organization_id=eq.${session.organizationId}`,
      { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify(patch) }
    );
    res.json({ student: rows[0], updated: true });
  }));
  app2.post("/api/mvp/students/:id/archive", ah(async (req, res) => {
    const session = getSession(req);
    if (!supabaseEnabled) return res.status(503).json({ error: "Supabase is not configured" });
    const reason = req.body && String(req.body.reason || "").trim() || "";
    const comment = req.body && String(req.body.comment || "").trim() || "";
    const leftOn = req.body && req.body.leftOn ? String(req.body.leftOn).slice(0, 10) : (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
    if (!reason) return res.status(400).json({ error: "\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u043F\u0440\u0438\u0447\u0438\u043D\u0443 \u0443\u0445\u043E\u0434\u0430 \u0443\u0447\u0435\u043D\u0438\u043A\u0430" });
    if (!comment) return res.status(400).json({ error: "\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u043A\u043E\u043C\u043C\u0435\u043D\u0442\u0430\u0440\u0438\u0439" });
    const existing = await supabaseFetch(
      "students",
      `select=id,branch_id&id=eq.${req.params.id}&organization_id=eq.${session.organizationId}`
    );
    if (!existing[0]) return res.status(404).json({ error: "\u0423\u0447\u0435\u043D\u0438\u043A \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D" });
    if (!canSeeBranch(session, existing[0].branch_id)) {
      return res.status(403).json({ error: "Branch access denied" });
    }
    const archivedBy = { owner: "\u0412\u043B\u0430\u0434\u0435\u043B\u0435\u0446", branch_manager: "\u0420\u0443\u043A\u043E\u0432\u043E\u0434\u0438\u0442\u0435\u043B\u044C \u0444\u0438\u043B\u0438\u0430\u043B\u0430", admin: "\u0410\u0434\u043C\u0438\u043D\u0438\u0441\u0442\u0440\u0430\u0442\u043E\u0440", teacher: "\u041F\u0440\u0435\u043F\u043E\u0434\u0430\u0432\u0430\u0442\u0435\u043B\u044C" }[session.role] || session.role;
    const rows = await supabaseFetch(
      "students",
      `id=eq.${req.params.id}&organization_id=eq.${session.organizationId}`,
      { method: "PATCH", body: JSON.stringify({
        archived_at: (/* @__PURE__ */ new Date()).toISOString(),
        left_on: leftOn,
        archive_reason: reason,
        archive_comment: comment,
        archived_by: archivedBy,
        // если ученик был в корзине — заявка закрывается переводом в архив
        deletion_requested_at: null,
        deletion_requested_by: null,
        deletion_reason: null
      }) }
    );
    res.json({ student: rows[0], archived: true });
  }));
  app2.post("/api/mvp/students/:id/unarchive", ah(async (req, res) => {
    const session = getSession(req);
    if (!supabaseEnabled) return res.status(503).json({ error: "Supabase is not configured" });
    const existing = await supabaseFetch(
      "students",
      `select=id,branch_id&id=eq.${req.params.id}&organization_id=eq.${session.organizationId}`
    );
    if (!existing[0]) return res.status(404).json({ error: "\u0423\u0447\u0435\u043D\u0438\u043A \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D" });
    if (!canSeeBranch(session, existing[0].branch_id)) {
      return res.status(403).json({ error: "Branch access denied" });
    }
    const rows = await supabaseFetch(
      "students",
      `id=eq.${req.params.id}&organization_id=eq.${session.organizationId}`,
      { method: "PATCH", body: JSON.stringify({
        archived_at: null,
        archive_reason: null,
        archive_comment: null,
        archived_by: null
      }) }
    );
    if (!rows[0]) return res.status(404).json({ error: "\u0423\u0447\u0435\u043D\u0438\u043A \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D" });
    res.json({ student: rows[0], restored: true });
  }));
  app2.get("/api/mvp/students/archive", ah(async (req, res) => {
    const session = getSession(req);
    if (!supabaseEnabled) return res.status(503).json({ error: "Supabase is not configured" });
    const rows = (await supabaseFetch(
      "students",
      `select=*&organization_id=eq.${session.organizationId}&archived_at=not.is.null&order=archived_at.desc`
    )).filter((row) => canSeeBranch(session, row.branch_id));
    const ids = rows.map((r) => r.id);
    const subsCount = /* @__PURE__ */ new Map();
    if (ids.length) {
      const subs = await supabaseFetch(
        "student_subscriptions",
        `select=student_id&student_id=in.(${ids.join(",")})`
      ).catch(() => []);
      for (const s of subs) subsCount.set(s.student_id, (subsCount.get(s.student_id) || 0) + 1);
    }
    const students = rows.map((row) => {
      const subscriptionsCount = subsCount.get(row.id) || 0;
      return {
        id: row.id,
        name: [row.first_name, row.last_name].filter(Boolean).join(" ") || row.full_name || "\u0423\u0447\u0435\u043D\u0438\u043A",
        branchId: row.branch_id,
        phone: row.phone || row.parent_phone || "",
        parentName: row.parent_name || "",
        parentPhone: row.parent_phone || "",
        archivedAt: row.archived_at,
        leftOn: row.left_on || null,
        archivedBy: row.archived_by || "\u2014",
        archiveReason: row.archive_reason || "",
        archiveComment: row.archive_comment || "",
        subscriptionsCount,
        // «Ушедший» = был реальным учеником (купил ≥1 абонемент);
        // иначе «Отказавшийся» (ушёл на этапе пробных, ничего не купив).
        category: subscriptionsCount >= 1 ? "left" : "declined"
      };
    });
    res.json({ students });
  }));
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
  app2.post("/api/mvp/student-subscriptions", async (req, res) => {
    const session = getSession(req);
    const payload = req.body || {};
    const studentId = payload.studentId;
    const branchId = payload.branchId;
    const planId = payload.planId;
    if (!studentId || !branchId || !planId) {
      return res.status(400).json({ error: "studentId, branchId and planId are required" });
    }
    if (!canSeeBranch(session, branchId)) {
      return res.status(403).json({ error: "Branch access denied" });
    }
    if (!supabaseEnabled) {
      return res.status(503).json({ error: "Supabase is not configured" });
    }
    try {
      const plans = await supabaseFetch(
        "subscription_plans",
        `select=*&id=eq.${planId}&organization_id=eq.${session.organizationId}`
      );
      const plan = plans[0];
      if (!plan) return res.status(404).json({ error: "\u041F\u043B\u0430\u043D \u0430\u0431\u043E\u043D\u0435\u043C\u0435\u043D\u0442\u0430 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D" });
      const lessonsTotal = Number(payload.lessonsTotal) > 0 ? Math.round(Number(payload.lessonsTotal)) : Number(plan.lessons_count) || 0;
      const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
      const startsOn = payload.startsOn || today;
      let endsOn = payload.endsOn || startsOn;
      if (endsOn < startsOn) endsOn = startsOn;
      const basePrice = Number(plan.price) || 0;
      const discountAmount = Math.max(0, Number(payload.discountAmount) || 0);
      const recalc = Math.max(0, Number(payload.recalc) || 0);
      const finalPrice = payload.price !== void 0 ? Math.max(0, Number(payload.price) || 0) : Math.max(0, basePrice - discountAmount - recalc);
      const paid = payload.paid !== false;
      if (paid && payload.groupId) {
        const overlap = await supabaseFetch(
          "student_subscriptions",
          `select=id,starts_on,ends_on&student_id=eq.${studentId}&group_id=eq.${payload.groupId}&status=eq.active&starts_on=lte.${endsOn}&ends_on=gte.${startsOn}`
        ).catch(() => []);
        if (overlap.length > 0) {
          return res.status(409).json({ error: "\u0423 \u0443\u0447\u0435\u043D\u0438\u043A\u0430 \u0443\u0436\u0435 \u0435\u0441\u0442\u044C \u0430\u043A\u0442\u0438\u0432\u043D\u044B\u0439 \u0430\u0431\u043E\u043D\u0435\u043C\u0435\u043D\u0442 \u0432 \u044D\u0442\u043E\u0439 \u0433\u0440\u0443\u043F\u043F\u0435 \u043D\u0430 \u043F\u0435\u0440\u0435\u0441\u0435\u043A\u0430\u044E\u0449\u0438\u0439\u0441\u044F \u043F\u0435\u0440\u0438\u043E\u0434. \u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0434\u0440\u0443\u0433\u0443\u044E \u0433\u0440\u0443\u043F\u043F\u0443, \u043F\u0435\u0440\u0438\u043E\u0434 \u0438\u043B\u0438 \u0438\u043D\u0434\u0438\u0432\u0438\u0434\u0443\u0430\u043B\u044C\u043D\u043E\u0435 \u0437\u0430\u043D\u044F\u0442\u0438\u0435." });
        }
      }
      const insertedSub = await supabaseFetch("student_subscriptions", "", {
        method: "POST",
        body: JSON.stringify({
          student_id: studentId,
          plan_id: planId,
          branch_id: branchId,
          group_id: payload.groupId || null,
          starts_on: startsOn,
          ends_on: endsOn,
          lessons_total: lessonsTotal,
          lessons_left: lessonsTotal,
          price: finalPrice,
          discount_amount: discountAmount + recalc,
          status: paid ? "active" : "inactive"
        })
      });
      let payment = null;
      if (paid && finalPrice > 0) {
        const insertedPayment = await supabaseFetch("payments", "", {
          method: "POST",
          body: JSON.stringify({
            organization_id: session.organizationId,
            branch_id: branchId,
            student_id: studentId,
            amount: finalPrice,
            method: payload.method || "kaspi",
            status: "paid",
            comment: payload.description || `\u0410\u0431\u043E\u043D\u0435\u043C\u0435\u043D\u0442: ${plan.name}`,
            created_by: session.userId.startsWith("demo-") ? null : session.userId
          })
        });
        payment = mapDbPayment(insertedPayment[0]);
        await supabaseFetch("finance_transactions", "", {
          method: "POST",
          body: JSON.stringify({
            organization_id: session.organizationId,
            branch_id: branchId,
            student_id: studentId,
            payment_id: insertedPayment[0].id,
            amount: finalPrice,
            type: "income",
            category: "tuition",
            description: payload.description || `\u0410\u0431\u043E\u043D\u0435\u043C\u0435\u043D\u0442: ${plan.name}`
          })
        });
      }
      let waitlistClosed = false;
      if (paid) {
        try {
          const closed = await supabaseFetch(
            "student_waitlist",
            `student_id=eq.${studentId}&organization_id=eq.${session.organizationId}&removed_at=is.null`,
            { method: "PATCH", body: JSON.stringify({ removed_at: (/* @__PURE__ */ new Date()).toISOString(), removed_reason: "enrolled" }) }
          );
          waitlistClosed = closed.length > 0;
        } catch {
        }
      }
      res.status(201).json({
        subscription: mapDbSubscription(insertedSub[0], plan.name),
        payment,
        waitlistClosed
      });
    } catch (error) {
      res.status(400).json({ error: error.message || "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043F\u0440\u043E\u0434\u0430\u0442\u044C \u0430\u0431\u043E\u043D\u0435\u043C\u0435\u043D\u0442" });
    }
  });
  app2.delete("/api/mvp/student-subscriptions/:id", async (req, res) => {
    const session = getSession(req);
    if (!["owner", "branch_manager", "admin"].includes(session.role)) return res.status(403).json({ error: "\u041D\u0435\u0434\u043E\u0441\u0442\u0430\u0442\u043E\u0447\u043D\u043E \u043F\u0440\u0430\u0432" });
    if (!supabaseEnabled) return res.status(503).json({ error: "Supabase is not configured" });
    const reason = String((req.body || {}).reason || "").trim();
    const comment = String((req.body || {}).comment || "").trim() || null;
    if (!reason) return res.status(400).json({ error: "\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u043F\u0440\u0438\u0447\u0438\u043D\u0443 \u0443\u0434\u0430\u043B\u0435\u043D\u0438\u044F \u0430\u0431\u043E\u043D\u0435\u043C\u0435\u043D\u0442\u0430" });
    try {
      const rows = await supabaseFetch("student_subscriptions", `id=eq.${req.params.id}`, {
        method: "PATCH",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({ status: "archived", cancel_reason: reason, cancel_comment: comment, deleted_by: session.fullName || session.role, deleted_at: (/* @__PURE__ */ new Date()).toISOString() })
      });
      if (!rows[0]) return res.status(404).json({ error: "\u0410\u0431\u043E\u043D\u0435\u043C\u0435\u043D\u0442 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D" });
      res.json({ ok: true, subscription: mapDbSubscription(rows[0]) });
    } catch (error) {
      res.status(400).json({ error: error.message || "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0443\u0434\u0430\u043B\u0438\u0442\u044C \u0430\u0431\u043E\u043D\u0435\u043C\u0435\u043D\u0442" });
    }
  });
  app2.get("/api/mvp/students/:id/history", async (req, res) => {
    const session = getSession(req);
    if (!supabaseEnabled) return res.json({ events: [] });
    const sid = req.params.id;
    try {
      const [stu, statusEv, pays, subs, echo] = await Promise.all([
        supabaseFetch("students", `select=created_at,archived_at,archive_reason,archived_by,deletion_requested_at,deletion_reason,deletion_requested_by&id=eq.${sid}&organization_id=eq.${session.organizationId}&limit=1`).catch(() => []),
        supabaseFetch("student_status_events", `select=from_status,to_status,occurred_at,created_by&student_id=eq.${sid}&order=occurred_at.desc`).catch(() => []),
        supabaseFetch("payments", `select=amount,paid_at,comment&student_id=eq.${sid}&order=paid_at.desc`).catch(() => []),
        supabaseFetch("student_subscriptions", `select=price,starts_on,ends_on,created_at,deleted_at,deleted_by,cancel_reason&student_id=eq.${sid}&order=created_at.desc`).catch(() => []),
        supabaseFetch("echo_transactions", `select=amount,reason,created_at,created_by&student_id=eq.${sid}&order=created_at.desc`).catch(() => [])
      ]);
      const ev = [];
      const s0 = stu[0];
      if (s0?.created_at) ev.push({ type: "created", title: "\u0423\u0447\u0435\u043D\u0438\u043A \u0434\u043E\u0431\u0430\u0432\u043B\u0435\u043D", detail: null, at: s0.created_at, by: null });
      for (const e of statusEv) ev.push({ type: "status", title: `\u0421\u0442\u0430\u0442\u0443\u0441: ${e.from_status || "\u2014"} \u2192 ${e.to_status}`, detail: null, at: e.occurred_at, by: e.created_by });
      for (const p of pays) ev.push({ type: "payment", title: `\u041E\u043F\u043B\u0430\u0442\u0430 ${Math.round(Number(p.amount) || 0)} \u20B8`, detail: p.comment || null, at: p.paid_at, by: null });
      for (const sub of subs) {
        ev.push({ type: "sub_buy", title: `\u041A\u0443\u043F\u043B\u0435\u043D \u0430\u0431\u043E\u043D\u0435\u043C\u0435\u043D\u0442${sub.price ? ` \xB7 ${Math.round(Number(sub.price))} \u20B8` : ""}`, detail: [sub.starts_on, sub.ends_on].filter(Boolean).join(" \u2013 ") || null, at: sub.created_at, by: null });
        if (sub.deleted_at) ev.push({ type: "sub_del", title: "\u0423\u0434\u0430\u043B\u0451\u043D \u0430\u0431\u043E\u043D\u0435\u043C\u0435\u043D\u0442", detail: sub.cancel_reason || null, at: sub.deleted_at, by: sub.deleted_by });
      }
      for (const t of echo) ev.push({ type: "echo", title: `\u042D\u0445\u043E\u0411\u0430\u043A\u0441\u044B ${Number(t.amount) > 0 ? "+" : ""}${t.amount} \u2B50`, detail: t.reason || null, at: t.created_at, by: t.created_by });
      if (s0?.archived_at) ev.push({ type: "archive", title: "\u041F\u0435\u0440\u0435\u0432\u0435\u0434\u0451\u043D \u0432 \u0430\u0440\u0445\u0438\u0432", detail: s0.archive_reason || null, at: s0.archived_at, by: s0.archived_by });
      if (s0?.deletion_requested_at) ev.push({ type: "trash", title: "\u041F\u0435\u0440\u0435\u043C\u0435\u0449\u0451\u043D \u0432 \u043A\u043E\u0440\u0437\u0438\u043D\u0443", detail: s0.deletion_reason || null, at: s0.deletion_requested_at, by: s0.deletion_requested_by });
      ev.sort((a, b) => new Date(b.at || 0).getTime() - new Date(a.at || 0).getTime());
      res.json({ events: ev });
    } catch (error) {
      res.status(400).json({ error: error.message || "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C \u0438\u0441\u0442\u043E\u0440\u0438\u044E" });
    }
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
    const rows = await upsertAttendanceRows([{
      lesson_id: lessonId,
      student_id: payload.studentId,
      status: payload.status === "unmarked" ? "unknown" : payload.status,
      marked_by: session.userId.startsWith("demo-") ? null : session.userId,
      marked_at: (/* @__PURE__ */ new Date()).toISOString(),
      comment: payload.comment || null,
      absence_reason: payload.absenceReason || null,
      is_trial: Boolean(payload.isTrial) || void 0,
      trial_outcome: payload.trialOutcome || void 0
    }]);
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
  const ownerOnly = (session, res) => {
    if (session.role !== "owner") {
      res.status(403).json({ error: "\u0422\u043E\u043B\u044C\u043A\u043E \u0432\u043B\u0430\u0434\u0435\u043B\u0435\u0446 \u043C\u043E\u0436\u0435\u0442 \u0443\u043F\u0440\u0430\u0432\u043B\u044F\u0442\u044C \u0444\u0438\u043B\u0438\u0430\u043B\u0430\u043C\u0438" });
      return false;
    }
    if (!supabaseEnabled) {
      res.status(503).json({ error: "Supabase is not configured" });
      return false;
    }
    return true;
  };
  app2.post("/api/mvp/branches", async (req, res) => {
    const session = getSession(req);
    if (!ownerOnly(session, res)) return;
    const payload = req.body || {};
    if (!payload.name || !payload.city) {
      return res.status(400).json({ error: "name and city are required" });
    }
    try {
      const inserted = await supabaseFetch("branches", "", {
        method: "POST",
        body: JSON.stringify({
          organization_id: session.organizationId,
          name: payload.name,
          city: payload.city,
          address: payload.address || "",
          phone: payload.phone || null,
          manager_name: payload.managerName || null,
          comment: payload.comment || null,
          status: payload.status === "archived" ? "archived" : "active"
        })
      });
      res.status(201).json({ branch: inserted[0] });
    } catch (error) {
      res.status(400).json({ error: error.message || "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0441\u043E\u0437\u0434\u0430\u0442\u044C \u0444\u0438\u043B\u0438\u0430\u043B" });
    }
  });
  app2.patch("/api/mvp/branches/:id", async (req, res) => {
    const session = getSession(req);
    if (!ownerOnly(session, res)) return;
    const payload = req.body || {};
    const updates = {};
    ["name", "city", "address", "phone"].forEach((key) => {
      if (payload[key] !== void 0) updates[key] = payload[key];
    });
    if (payload.managerName !== void 0) updates.manager_name = payload.managerName || null;
    if (payload.comment !== void 0) updates.comment = payload.comment || null;
    if (payload.status !== void 0) updates.status = payload.status === "archived" ? "archived" : "active";
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "\u041D\u0435\u0442 \u043F\u043E\u043B\u0435\u0439 \u0434\u043B\u044F \u043E\u0431\u043D\u043E\u0432\u043B\u0435\u043D\u0438\u044F" });
    }
    try {
      const rows = await supabaseFetch(
        "branches",
        `id=eq.${req.params.id}&organization_id=eq.${session.organizationId}`,
        { method: "PATCH", body: JSON.stringify(updates) }
      );
      if (!rows[0]) return res.status(404).json({ error: "\u0424\u0438\u043B\u0438\u0430\u043B \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D" });
      res.json({ branch: rows[0] });
    } catch (error) {
      res.status(400).json({ error: error.message || "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043E\u0431\u043D\u043E\u0432\u0438\u0442\u044C \u0444\u0438\u043B\u0438\u0430\u043B" });
    }
  });
  app2.delete("/api/mvp/branches/:id", async (req, res) => {
    const session = getSession(req);
    if (!ownerOnly(session, res)) return;
    try {
      const rows = await supabaseFetch(
        "branches",
        `id=eq.${req.params.id}&organization_id=eq.${session.organizationId}`,
        { method: "PATCH", body: JSON.stringify({ status: "archived" }) }
      );
      if (!rows[0]) return res.status(404).json({ error: "\u0424\u0438\u043B\u0438\u0430\u043B \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D" });
      res.json({ branch: rows[0], archived: true });
    } catch (error) {
      res.status(400).json({ error: error.message || "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0443\u0434\u0430\u043B\u0438\u0442\u044C \u0444\u0438\u043B\u0438\u0430\u043B" });
    }
  });
  const hallAccess = (session, res) => {
    if (!["owner", "admin", "branch_manager"].includes(session.role)) {
      res.status(403).json({ error: "\u041D\u0435\u0434\u043E\u0441\u0442\u0430\u0442\u043E\u0447\u043D\u043E \u043F\u0440\u0430\u0432 \u0434\u043B\u044F \u0443\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u044F \u0437\u0430\u043B\u0430\u043C\u0438" });
      return false;
    }
    if (!supabaseEnabled) {
      res.status(503).json({ error: "Supabase is not configured" });
      return false;
    }
    return true;
  };
  app2.post("/api/mvp/halls", async (req, res) => {
    const session = getSession(req);
    if (!hallAccess(session, res)) return;
    const payload = req.body || {};
    if (!payload.name || !payload.branchId) {
      return res.status(400).json({ error: "name \u0438 branchId \u043E\u0431\u044F\u0437\u0430\u0442\u0435\u043B\u044C\u043D\u044B" });
    }
    if (!canSeeBranch(session, payload.branchId)) {
      return res.status(403).json({ error: "Branch access denied" });
    }
    try {
      const inserted = await supabaseFetch("halls", "", {
        method: "POST",
        body: JSON.stringify({
          branch_id: payload.branchId,
          name: String(payload.name).trim(),
          capacity: payload.capacity ?? 0,
          description: payload.description || null,
          status: payload.status === "archived" ? "archived" : "active"
        })
      });
      const h = inserted[0];
      res.status(201).json({ hall: { id: h.id, branchId: h.branch_id, name: h.name, capacity: h.capacity || 0, description: h.description || "", status: h.status || "active" } });
    } catch (error) {
      res.status(400).json({ error: error.message || "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0441\u043E\u0437\u0434\u0430\u0442\u044C \u0437\u0430\u043B" });
    }
  });
  app2.patch("/api/mvp/halls/:id", async (req, res) => {
    const session = getSession(req);
    if (!hallAccess(session, res)) return;
    const payload = req.body || {};
    const updates = {};
    if (payload.name !== void 0) updates.name = String(payload.name).trim();
    if (payload.branchId !== void 0) {
      if (!canSeeBranch(session, payload.branchId)) return res.status(403).json({ error: "Branch access denied" });
      updates.branch_id = payload.branchId;
    }
    if (payload.capacity !== void 0) updates.capacity = payload.capacity ?? 0;
    if (payload.description !== void 0) updates.description = payload.description || null;
    if (payload.status !== void 0) updates.status = payload.status === "archived" ? "archived" : "active";
    if (Object.keys(updates).length === 0) return res.status(400).json({ error: "\u041D\u0435\u0442 \u043F\u043E\u043B\u0435\u0439 \u0434\u043B\u044F \u043E\u0431\u043D\u043E\u0432\u043B\u0435\u043D\u0438\u044F" });
    try {
      const rows = await supabaseFetch("halls", `id=eq.${req.params.id}`, {
        method: "PATCH",
        body: JSON.stringify(updates)
      });
      if (!rows[0]) return res.status(404).json({ error: "\u0417\u0430\u043B \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D" });
      const h = rows[0];
      res.json({ hall: { id: h.id, branchId: h.branch_id, name: h.name, capacity: h.capacity || 0, description: h.description || "", status: h.status || "active" } });
    } catch (error) {
      res.status(400).json({ error: error.message || "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043E\u0431\u043D\u043E\u0432\u0438\u0442\u044C \u0437\u0430\u043B" });
    }
  });
  app2.delete("/api/mvp/halls/:id", async (req, res) => {
    const session = getSession(req);
    if (!hallAccess(session, res)) return;
    try {
      const rows = await supabaseFetch("halls", `id=eq.${req.params.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "archived" })
      });
      if (!rows[0]) return res.status(404).json({ error: "\u0417\u0430\u043B \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D" });
      res.json({ hall: { id: rows[0].id }, archived: true });
    } catch (error) {
      res.status(400).json({ error: error.message || "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0443\u0434\u0430\u043B\u0438\u0442\u044C \u0437\u0430\u043B" });
    }
  });
  const allowedRoles = ["teacher", "admin", "branch_manager", "owner"];
  const normalizeRole = (value) => {
    const role = String(value || "teacher");
    return allowedRoles.includes(role) ? role : "teacher";
  };
  app2.post("/api/mvp/teachers", async (req, res) => {
    const session = getSession(req);
    if (!ownerOnly(session, res)) return;
    const payload = req.body || {};
    if (!payload.name || !String(payload.name).trim()) {
      return res.status(400).json({ error: "\u0418\u043C\u044F \u043E\u0431\u044F\u0437\u0430\u0442\u0435\u043B\u044C\u043D\u043E" });
    }
    try {
      const inserted = await supabaseFetch("users", "", {
        method: "POST",
        body: JSON.stringify({
          organization_id: session.organizationId,
          branch_id: payload.branchId || null,
          role: normalizeRole(payload.role),
          full_name: String(payload.name).trim(),
          phone: payload.phone || null,
          email: payload.email || `staff-${Date.now()}@echogor.demo`,
          password_hash: "demo-only",
          specialization: payload.specialization || null,
          status: "active"
        })
      });
      res.status(201).json({ teacher: mapDbUserToTeacher(inserted[0]) });
    } catch (error) {
      res.status(400).json({ error: error.message || "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0441\u043E\u0437\u0434\u0430\u0442\u044C \u043F\u0440\u0435\u043F\u043E\u0434\u0430\u0432\u0430\u0442\u0435\u043B\u044F" });
    }
  });
  app2.patch("/api/mvp/teachers/:id", async (req, res) => {
    const session = getSession(req);
    if (!ownerOnly(session, res)) return;
    const payload = req.body || {};
    const updates = {};
    if (payload.name !== void 0) updates.full_name = String(payload.name).trim();
    if (payload.phone !== void 0) updates.phone = payload.phone || null;
    if (payload.specialization !== void 0) updates.specialization = payload.specialization || null;
    if (payload.branchId !== void 0) updates.branch_id = payload.branchId || null;
    if (payload.role !== void 0) updates.role = normalizeRole(payload.role);
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "\u041D\u0435\u0442 \u043F\u043E\u043B\u0435\u0439 \u0434\u043B\u044F \u043E\u0431\u043D\u043E\u0432\u043B\u0435\u043D\u0438\u044F" });
    }
    try {
      const rows = await supabaseFetch(
        "users",
        `id=eq.${req.params.id}&organization_id=eq.${session.organizationId}`,
        { method: "PATCH", body: JSON.stringify(updates) }
      );
      if (!rows[0]) return res.status(404).json({ error: "\u0421\u043E\u0442\u0440\u0443\u0434\u043D\u0438\u043A \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D" });
      res.json({ teacher: mapDbUserToTeacher(rows[0]) });
    } catch (error) {
      res.status(400).json({ error: error.message || "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043E\u0431\u043D\u043E\u0432\u0438\u0442\u044C \u043F\u0440\u0435\u043F\u043E\u0434\u0430\u0432\u0430\u0442\u0435\u043B\u044F" });
    }
  });
  app2.delete("/api/mvp/teachers/:id", async (req, res) => {
    const session = getSession(req);
    if (!ownerOnly(session, res)) return;
    try {
      const rows = await supabaseFetch(
        "users",
        `id=eq.${req.params.id}&organization_id=eq.${session.organizationId}`,
        { method: "PATCH", body: JSON.stringify({ status: "archived" }) }
      );
      if (!rows[0]) return res.status(404).json({ error: "\u0421\u043E\u0442\u0440\u0443\u0434\u043D\u0438\u043A \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D" });
      res.json({ teacher: mapDbUserToTeacher(rows[0]), archived: true });
    } catch (error) {
      res.status(400).json({ error: error.message || "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0443\u0434\u0430\u043B\u0438\u0442\u044C \u043F\u0440\u0435\u043F\u043E\u0434\u0430\u0432\u0430\u0442\u0435\u043B\u044F" });
    }
  });
  app2.get("/api/mvp/dance-events", async (req, res) => {
    if (!supabaseEnabled) return res.status(503).json({ error: "Supabase is not configured" });
    const parts = ["select=*", "order=start_date.asc.nullslast"];
    const { type, audience, country, status, q } = req.query;
    if (type) parts.push(`event_type=eq.${type}`);
    if (audience) parts.push(`audience=eq.${audience}`);
    if (country) parts.push(`country=in.(${country})`);
    if (status) parts.push(`status=eq.${status}`);
    if (q) parts.push(`title=ilike.*${encodeURIComponent(q)}*`);
    try {
      const rows = await supabaseFetch("dance_events", parts.join("&"));
      res.json({ events: rows });
    } catch (error) {
      res.status(400).json({ error: error.message || "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C \u0441\u043E\u0431\u044B\u0442\u0438\u044F" });
    }
  });
  app2.post("/api/mvp/dance-events/parse", async (req, res) => {
    const session = getSession(req);
    if (session.role !== "owner") return res.status(403).json({ error: "\u0422\u043E\u043B\u044C\u043A\u043E \u0432\u043B\u0430\u0434\u0435\u043B\u0435\u0446 \u043C\u043E\u0436\u0435\u0442 \u0437\u0430\u043F\u0443\u0441\u043A\u0430\u0442\u044C \u043F\u0430\u0440\u0441\u0438\u043D\u0433" });
    if (!supabaseEnabled) return res.status(503).json({ error: "Supabase is not configured" });
    const { dryRun, maxDetailFetches, sources, maxMs } = req.body || {};
    try {
      const result = await runParser({
        dryRun: Boolean(dryRun),
        maxDetailFetches: Number(maxDetailFetches) || void 0,
        sources: Array.isArray(sources) && sources.length ? sources : void 0,
        maxMs: Number(maxMs) || 45e3,
        // под лимит serverless-функции
        log: (m) => console.log("[dance-events]", m)
      });
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message || "\u041F\u0430\u0440\u0441\u0438\u043D\u0433 \u043D\u0435 \u0432\u044B\u043F\u043E\u043B\u043D\u0435\u043D" });
    }
  });
  app2.post("/api/mvp/dance-events", async (req, res) => {
    const session = getSession(req);
    if (session.role !== "owner") return res.status(403).json({ error: "\u0422\u043E\u043B\u044C\u043A\u043E \u0432\u043B\u0430\u0434\u0435\u043B\u0435\u0446 \u043C\u043E\u0436\u0435\u0442 \u0434\u043E\u0431\u0430\u0432\u043B\u044F\u0442\u044C \u0441\u043E\u0431\u044B\u0442\u0438\u044F" });
    if (!supabaseEnabled) return res.status(503).json({ error: "Supabase is not configured" });
    const b = req.body || {};
    if (!b.title) return res.status(400).json({ error: "title \u043E\u0431\u044F\u0437\u0430\u0442\u0435\u043B\u0435\u043D" });
    const candidate = {
      title: String(b.title),
      url: b.url || "",
      source: "manual",
      sourceUid: b.sourceUid || void 0,
      dateText: b.dateText || void 0,
      city: b.city || void 0,
      country: b.country || void 0,
      venue: b.venue || void 0,
      organizer: b.organizer || void 0,
      priceText: b.price || void 0,
      image: b.image || void 0,
      ageText: b.ageText || void 0,
      raw: b
    };
    const ev = normalize(candidate);
    if (b.eventType) ev.event_type = b.eventType;
    if (b.audience) ev.audience = b.audience;
    if (b.regDeadline) ev.reg_deadline = b.regDeadline;
    if (b.ageCategories) ev.age_categories = b.ageCategories;
    if (b.disciplines) ev.disciplines = b.disciplines;
    try {
      const n = await supabaseUpsert([ev]);
      res.status(201).json({ event: ev, upserted: n });
    } catch (error) {
      res.status(400).json({ error: error.message || "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0441\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C \u0441\u043E\u0431\u044B\u0442\u0438\u0435" });
    }
  });
  app2.patch("/api/mvp/dance-events/:id", async (req, res) => {
    const session = getSession(req);
    if (session.role !== "owner") return res.status(403).json({ error: "\u0422\u043E\u043B\u044C\u043A\u043E \u0432\u043B\u0430\u0434\u0435\u043B\u0435\u0446 \u043C\u043E\u0436\u0435\u0442 \u043C\u0435\u043D\u044F\u0442\u044C \u0441\u043E\u0431\u044B\u0442\u0438\u044F" });
    if (!supabaseEnabled) return res.status(503).json({ error: "Supabase is not configured" });
    const b = req.body || {};
    const updates = { updated_at: (/* @__PURE__ */ new Date()).toISOString() };
    for (const key of ["status", "event_type", "audience", "title", "city", "country", "venue", "organizer", "price", "url", "image", "age_categories", "disciplines"]) {
      if (b[key] !== void 0) updates[key] = b[key];
    }
    for (const key of ["start_date", "end_date", "reg_deadline"]) {
      if (b[key] !== void 0) updates[key] = b[key] || null;
    }
    try {
      const rows = await supabaseFetch("dance_events", `id=eq.${req.params.id}`, {
        method: "PATCH",
        body: JSON.stringify(updates)
      });
      if (!rows[0]) return res.status(404).json({ error: "\u0421\u043E\u0431\u044B\u0442\u0438\u0435 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u043E" });
      res.json({ event: rows[0] });
    } catch (error) {
      res.status(400).json({ error: error.message || "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043E\u0431\u043D\u043E\u0432\u0438\u0442\u044C \u0441\u043E\u0431\u044B\u0442\u0438\u0435" });
    }
  });
  function mapDbGroup(row, studentCount = 0) {
    return {
      id: row.id,
      organizationId: row.organization_id,
      branchId: row.branch_id,
      name: row.name,
      teacherId: row.teacher_id || "",
      hallId: row.hall_id || "",
      scheduleText: [row.schedule_days, row.schedule_time].filter(Boolean).join(" ") || "\u041F\u043E \u0440\u0430\u0441\u043F\u0438\u0441\u0430\u043D\u0438\u044E",
      days: row.schedule_days ? String(row.schedule_days).split(",").map((d) => d.trim()) : [],
      time: row.schedule_time || "",
      ageGroup: row.age_from != null && row.age_to != null ? `${row.age_from}\u2013${row.age_to} \u043B\u0435\u0442` : "\u0412\u0441\u0435 \u0432\u043E\u0437\u0440\u0430\u0441\u0442\u044B",
      level: row.level || "MVP",
      startDate: row.start_date || null,
      endDate: row.end_date || null,
      studentCount
    };
  }
  const groupAccess = (session, res) => {
    if (!["owner", "admin", "branch_manager"].includes(session.role)) {
      res.status(403).json({ error: "\u041D\u0435\u0434\u043E\u0441\u0442\u0430\u0442\u043E\u0447\u043D\u043E \u043F\u0440\u0430\u0432 \u0434\u043B\u044F \u0443\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u044F \u0433\u0440\u0443\u043F\u043F\u0430\u043C\u0438" });
      return false;
    }
    if (!supabaseEnabled) {
      res.status(503).json({ error: "Supabase is not configured" });
      return false;
    }
    return true;
  };
  app2.post("/api/mvp/groups", async (req, res) => {
    const session = getSession(req);
    if (!groupAccess(session, res)) return;
    const payload = req.body || {};
    if (!payload.name || !payload.branchId) {
      return res.status(400).json({ error: "name \u0438 branchId \u043E\u0431\u044F\u0437\u0430\u0442\u0435\u043B\u044C\u043D\u044B" });
    }
    if (!canSeeBranch(session, payload.branchId)) {
      return res.status(403).json({ error: "Branch access denied" });
    }
    try {
      const inserted = await supabaseFetch("groups", "", {
        method: "POST",
        body: JSON.stringify({
          organization_id: session.organizationId,
          branch_id: payload.branchId,
          hall_id: payload.hallId || null,
          teacher_id: payload.teacherId || null,
          name: String(payload.name).trim(),
          age_from: payload.ageFrom ?? null,
          age_to: payload.ageTo ?? null,
          capacity: payload.capacity ?? 0,
          level: payload.level || "\u041D\u0430\u0447\u0438\u043D\u0430\u044E\u0449\u0438\u0435",
          schedule_days: payload.scheduleDays || null,
          schedule_time: payload.scheduleTime || null,
          start_date: payload.startDate || null,
          end_date: payload.endDate || null,
          status: "active"
        })
      });
      res.status(201).json({ group: mapDbGroup(inserted[0]) });
    } catch (error) {
      res.status(400).json({ error: error.message || "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0441\u043E\u0437\u0434\u0430\u0442\u044C \u0433\u0440\u0443\u043F\u043F\u0443" });
    }
  });
  app2.patch("/api/mvp/groups/:id", async (req, res) => {
    const session = getSession(req);
    if (!groupAccess(session, res)) return;
    const payload = req.body || {};
    const updates = {};
    if (payload.name !== void 0) updates.name = String(payload.name).trim();
    if (payload.branchId !== void 0) {
      if (!canSeeBranch(session, payload.branchId)) return res.status(403).json({ error: "Branch access denied" });
      updates.branch_id = payload.branchId;
    }
    if (payload.hallId !== void 0) updates.hall_id = payload.hallId || null;
    if (payload.teacherId !== void 0) updates.teacher_id = payload.teacherId || null;
    if (payload.ageFrom !== void 0) updates.age_from = payload.ageFrom ?? null;
    if (payload.ageTo !== void 0) updates.age_to = payload.ageTo ?? null;
    if (payload.capacity !== void 0) updates.capacity = payload.capacity ?? 0;
    if (payload.level !== void 0) updates.level = payload.level || null;
    if (payload.scheduleDays !== void 0) updates.schedule_days = payload.scheduleDays || null;
    if (payload.scheduleTime !== void 0) updates.schedule_time = payload.scheduleTime || null;
    if (payload.startDate !== void 0) updates.start_date = payload.startDate || null;
    if (payload.endDate !== void 0) updates.end_date = payload.endDate || null;
    if (Object.keys(updates).length === 0) return res.status(400).json({ error: "\u041D\u0435\u0442 \u043F\u043E\u043B\u0435\u0439 \u0434\u043B\u044F \u043E\u0431\u043D\u043E\u0432\u043B\u0435\u043D\u0438\u044F" });
    try {
      let prevTeacherId = null;
      if (payload.teacherId !== void 0) {
        const current = await supabaseFetch("groups", `id=eq.${req.params.id}&organization_id=eq.${session.organizationId}&select=teacher_id`);
        prevTeacherId = current[0]?.teacher_id || null;
      }
      const rows = await supabaseFetch(
        "groups",
        `id=eq.${req.params.id}&organization_id=eq.${session.organizationId}`,
        { method: "PATCH", body: JSON.stringify(updates) }
      );
      if (!rows[0]) return res.status(404).json({ error: "\u0413\u0440\u0443\u043F\u043F\u0430 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u0430" });
      const newTeacherId = updates.teacher_id;
      if (payload.teacherId !== void 0 && (newTeacherId || null) !== prevTeacherId) {
        try {
          await supabaseFetch("group_teacher_history", "", {
            method: "POST",
            body: JSON.stringify({
              organization_id: session.organizationId,
              group_id: req.params.id,
              old_teacher_id: prevTeacherId,
              new_teacher_id: newTeacherId || null,
              changed_by: session.userId || null
            })
          });
        } catch {
        }
      }
      res.json({ group: mapDbGroup(rows[0]) });
    } catch (error) {
      res.status(400).json({ error: error.message || "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043E\u0431\u043D\u043E\u0432\u0438\u0442\u044C \u0433\u0440\u0443\u043F\u043F\u0443" });
    }
  });
  app2.delete("/api/mvp/groups/:id", async (req, res) => {
    const session = getSession(req);
    if (!groupAccess(session, res)) return;
    try {
      const rows = await supabaseFetch(
        "groups",
        `id=eq.${req.params.id}&organization_id=eq.${session.organizationId}`,
        { method: "PATCH", body: JSON.stringify({ status: "archived" }) }
      );
      if (!rows[0]) return res.status(404).json({ error: "\u0413\u0440\u0443\u043F\u043F\u0430 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u0430" });
      res.json({ group: mapDbGroup(rows[0]), archived: true });
    } catch (error) {
      res.status(400).json({ error: error.message || "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0443\u0434\u0430\u043B\u0438\u0442\u044C \u0433\u0440\u0443\u043F\u043F\u0443" });
    }
  });
  function mapDbLesson(row, extras = {}) {
    return {
      id: row.id,
      branchId: row.branch_id,
      groupId: row.group_id,
      groupName: extras.groupName || row.group_name || null,
      teacherId: row.teacher_id || null,
      teacherName: extras.teacherName || row.teacher_name || null,
      hallId: row.hall_id || null,
      hallName: extras.hallName || row.hall_name || null,
      startsAt: row.starts_at,
      endsAt: row.ends_at,
      status: row.status || "scheduled",
      topic: row.topic || null
    };
  }
  app2.get("/api/mvp/schedule", async (req, res) => {
    const session = getSession(req);
    if (!supabaseEnabled) return res.status(503).json({ error: "Supabase is not configured" });
    const { branchId, groupId, from, to } = req.query;
    const parts = ["select=*,groups(name),halls(name),users(full_name)", "order=starts_at.asc"];
    if (branchId) parts.push(`branch_id=eq.${branchId}`);
    else if (session.role !== "owner" && session.dbBranchId) parts.push(`branch_id=eq.${session.dbBranchId}`);
    if (groupId) parts.push(`group_id=eq.${groupId}`);
    if (from) parts.push(`starts_at=gte.${encodeURIComponent(from)}`);
    if (to) parts.push(`starts_at=lte.${encodeURIComponent(to)}`);
    if (session.role === "teacher") parts.push(`teacher_id=eq.${session.userId}`);
    try {
      const rows = await supabaseFetch("schedule_lessons", parts.join("&"));
      const lessons = rows.map(
        (row) => mapDbLesson(row, {
          groupName: row.groups?.name,
          hallName: row.halls?.name,
          teacherName: row.users?.full_name
        })
      );
      res.json({ lessons });
    } catch (error) {
      res.status(400).json({ error: error.message || "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C \u0440\u0430\u0441\u043F\u0438\u0441\u0430\u043D\u0438\u0435" });
    }
  });
  const scheduleAccess = (session, res) => {
    if (!["owner", "admin", "branch_manager"].includes(session.role)) {
      res.status(403).json({ error: "\u041D\u0435\u0434\u043E\u0441\u0442\u0430\u0442\u043E\u0447\u043D\u043E \u043F\u0440\u0430\u0432 \u0434\u043B\u044F \u0443\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u044F \u0440\u0430\u0441\u043F\u0438\u0441\u0430\u043D\u0438\u0435\u043C" });
      return false;
    }
    if (!supabaseEnabled) {
      res.status(503).json({ error: "Supabase is not configured" });
      return false;
    }
    return true;
  };
  app2.post("/api/mvp/schedule", async (req, res) => {
    const session = getSession(req);
    if (!scheduleAccess(session, res)) return;
    const payload = req.body || {};
    if (!payload.groupId || !payload.startsAt || !payload.endsAt) {
      return res.status(400).json({ error: "groupId, startsAt \u0438 endsAt \u043E\u0431\u044F\u0437\u0430\u0442\u0435\u043B\u044C\u043D\u044B" });
    }
    try {
      let branchId = payload.branchId;
      if (!branchId) {
        const groups = await supabaseFetch("groups", `select=branch_id&id=eq.${payload.groupId}`);
        branchId = groups[0]?.branch_id;
      }
      if (!canSeeBranch(session, branchId)) return res.status(403).json({ error: "Branch access denied" });
      const inserted = await supabaseFetch("schedule_lessons", "", {
        method: "POST",
        body: JSON.stringify({
          branch_id: branchId,
          group_id: payload.groupId,
          teacher_id: payload.teacherId || null,
          hall_id: payload.hallId || null,
          starts_at: payload.startsAt,
          ends_at: payload.endsAt,
          status: "scheduled",
          topic: payload.topic || null,
          created_by: session.userId.startsWith("demo-") ? null : session.userId
        })
      });
      res.status(201).json({ lesson: mapDbLesson(inserted[0]) });
    } catch (error) {
      res.status(400).json({ error: error.message || "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0441\u043E\u0437\u0434\u0430\u0442\u044C \u0443\u0440\u043E\u043A" });
    }
  });
  app2.patch("/api/mvp/schedule/:id", async (req, res) => {
    const session = getSession(req);
    if (!scheduleAccess(session, res)) return;
    const payload = req.body || {};
    const updates = {};
    if (payload.startsAt !== void 0) updates.starts_at = payload.startsAt;
    if (payload.endsAt !== void 0) updates.ends_at = payload.endsAt;
    if (payload.teacherId !== void 0) updates.teacher_id = payload.teacherId || null;
    if (payload.hallId !== void 0) updates.hall_id = payload.hallId || null;
    if (payload.status !== void 0) updates.status = payload.status;
    if (payload.topic !== void 0) updates.topic = payload.topic || null;
    if (Object.keys(updates).length === 0) return res.status(400).json({ error: "\u041D\u0435\u0442 \u043F\u043E\u043B\u0435\u0439 \u0434\u043B\u044F \u043E\u0431\u043D\u043E\u0432\u043B\u0435\u043D\u0438\u044F" });
    try {
      const rows = await supabaseFetch(
        "schedule_lessons",
        `id=eq.${req.params.id}`,
        { method: "PATCH", body: JSON.stringify(updates) }
      );
      if (!rows[0]) return res.status(404).json({ error: "\u0423\u0440\u043E\u043A \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D" });
      res.json({ lesson: mapDbLesson(rows[0]) });
    } catch (error) {
      res.status(400).json({ error: error.message || "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043E\u0431\u043D\u043E\u0432\u0438\u0442\u044C \u0443\u0440\u043E\u043A" });
    }
  });
  app2.delete("/api/mvp/schedule/:id", async (req, res) => {
    const session = getSession(req);
    if (!scheduleAccess(session, res)) return;
    try {
      const rows = await supabaseFetch(
        "schedule_lessons",
        `id=eq.${req.params.id}`,
        { method: "PATCH", body: JSON.stringify({ status: "cancelled" }) }
      );
      if (!rows[0]) return res.status(404).json({ error: "\u0423\u0440\u043E\u043A \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D" });
      res.json({ lesson: mapDbLesson(rows[0]), cancelled: true });
    } catch (error) {
      res.status(400).json({ error: error.message || "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043E\u0442\u043C\u0435\u043D\u0438\u0442\u044C \u0443\u0440\u043E\u043A" });
    }
  });
  app2.post("/api/mvp/tasks", async (req, res) => {
    const session = getSession(req);
    const payload = req.body || {};
    if (!payload.title || !String(payload.title).trim()) {
      return res.status(400).json({ error: "title is required" });
    }
    if (!supabaseEnabled) return res.status(503).json({ error: "Supabase is not configured" });
    const branchId = payload.branchId ?? session.dbBranchId ?? null;
    if (branchId && !canSeeBranch(session, branchId)) {
      return res.status(403).json({ error: "Branch access denied" });
    }
    try {
      const inserted = await supabaseFetch("tasks", "", {
        method: "POST",
        body: JSON.stringify({
          branch_id: branchId,
          student_id: payload.studentId || null,
          assigned_to: payload.assignedTo || null,
          created_by: session.userId,
          title: String(payload.title).trim(),
          description: payload.description || null,
          status: payload.status || "new",
          priority: payload.priority || "normal",
          due_at: payload.dueAt || null
        })
      });
      res.status(201).json({ task: mapDbTask(inserted[0]) });
    } catch (error) {
      res.status(400).json({ error: error.message || "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0441\u043E\u0437\u0434\u0430\u0442\u044C \u0437\u0430\u0434\u0430\u0447\u0443" });
    }
  });
  app2.patch("/api/mvp/tasks/:id", async (req, res) => {
    const session = getSession(req);
    const payload = req.body || {};
    if (!supabaseEnabled) return res.status(503).json({ error: "Supabase is not configured" });
    if (payload.branchId && !canSeeBranch(session, payload.branchId)) {
      return res.status(403).json({ error: "Branch access denied" });
    }
    const updates = {};
    if (payload.title !== void 0) updates.title = String(payload.title).trim();
    if (payload.description !== void 0) updates.description = payload.description || null;
    if (payload.status !== void 0) {
      updates.status = payload.status;
      updates.completed_at = payload.status === "done" ? (/* @__PURE__ */ new Date()).toISOString() : null;
    }
    if (payload.priority !== void 0) updates.priority = payload.priority;
    if (payload.dueAt !== void 0) updates.due_at = payload.dueAt || null;
    if (payload.studentId !== void 0) updates.student_id = payload.studentId || null;
    if (payload.assignedTo !== void 0) updates.assigned_to = payload.assignedTo || null;
    if (Object.keys(updates).length === 0) return res.status(400).json({ error: "\u041D\u0435\u0442 \u043F\u043E\u043B\u0435\u0439 \u0434\u043B\u044F \u043E\u0431\u043D\u043E\u0432\u043B\u0435\u043D\u0438\u044F" });
    try {
      const rows = await supabaseFetch("tasks", `id=eq.${req.params.id}`, { method: "PATCH", body: JSON.stringify(updates) });
      if (!rows[0]) return res.status(404).json({ error: "\u0417\u0430\u0434\u0430\u0447\u0430 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u0430" });
      res.json({ task: mapDbTask(rows[0]) });
    } catch (error) {
      res.status(400).json({ error: error.message || "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043E\u0431\u043D\u043E\u0432\u0438\u0442\u044C \u0437\u0430\u0434\u0430\u0447\u0443" });
    }
  });
  app2.delete("/api/mvp/tasks/:id", async (req, res) => {
    const session = getSession(req);
    if (!supabaseEnabled) return res.status(503).json({ error: "Supabase is not configured" });
    try {
      await supabaseFetch("tasks", `id=eq.${req.params.id}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
      res.json({ ok: true });
    } catch (error) {
      res.status(400).json({ error: error.message || "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0443\u0434\u0430\u043B\u0438\u0442\u044C \u0437\u0430\u0434\u0430\u0447\u0443" });
    }
  });
  app2.post("/api/mvp/subscription-plans", async (req, res) => {
    const session = getSession(req);
    const payload = req.body || {};
    if (!payload.name || !String(payload.name).trim()) return res.status(400).json({ error: "name is required" });
    if (!supabaseEnabled) return res.status(503).json({ error: "Supabase is not configured" });
    try {
      const inserted = await supabaseFetch("subscription_plans", "", {
        method: "POST",
        body: JSON.stringify({
          organization_id: session.organizationId,
          name: String(payload.name).trim(),
          lessons_count: Number(payload.lessonsCount) || 0,
          duration_days: Number(payload.durationDays) || 30,
          price: Number(payload.price) || 0,
          status: payload.status || "active"
        })
      });
      res.status(201).json({ plan: mapDbPlan(inserted[0]) });
    } catch (error) {
      res.status(400).json({ error: error.message || "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0441\u043E\u0437\u0434\u0430\u0442\u044C \u0430\u0431\u043E\u043D\u0435\u043C\u0435\u043D\u0442" });
    }
  });
  app2.patch("/api/mvp/subscription-plans/:id", async (req, res) => {
    const session = getSession(req);
    const payload = req.body || {};
    if (!supabaseEnabled) return res.status(503).json({ error: "Supabase is not configured" });
    const updates = {};
    if (payload.name !== void 0) updates.name = String(payload.name).trim();
    if (payload.lessonsCount !== void 0) updates.lessons_count = Number(payload.lessonsCount) || 0;
    if (payload.durationDays !== void 0) updates.duration_days = Number(payload.durationDays) || 0;
    if (payload.price !== void 0) updates.price = Number(payload.price) || 0;
    if (payload.status !== void 0) updates.status = payload.status;
    if (Object.keys(updates).length === 0) return res.status(400).json({ error: "\u041D\u0435\u0442 \u043F\u043E\u043B\u0435\u0439 \u0434\u043B\u044F \u043E\u0431\u043D\u043E\u0432\u043B\u0435\u043D\u0438\u044F" });
    try {
      const rows = await supabaseFetch("subscription_plans", `id=eq.${req.params.id}&organization_id=eq.${session.organizationId}`, { method: "PATCH", body: JSON.stringify(updates) });
      if (!rows[0]) return res.status(404).json({ error: "\u0410\u0431\u043E\u043D\u0435\u043C\u0435\u043D\u0442 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D" });
      res.json({ plan: mapDbPlan(rows[0]) });
    } catch (error) {
      res.status(400).json({ error: error.message || "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043E\u0431\u043D\u043E\u0432\u0438\u0442\u044C \u0430\u0431\u043E\u043D\u0435\u043C\u0435\u043D\u0442" });
    }
  });
  app2.delete("/api/mvp/subscription-plans/:id", async (req, res) => {
    const session = getSession(req);
    if (!supabaseEnabled) return res.status(503).json({ error: "Supabase is not configured" });
    const scope = `id=eq.${req.params.id}&organization_id=eq.${session.organizationId}`;
    try {
      await supabaseFetch("subscription_plans", scope, { method: "DELETE", headers: { Prefer: "return=minimal" } });
      res.json({ ok: true, archived: false });
    } catch (error) {
      try {
        await supabaseFetch("subscription_plans", scope, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ status: "archived" }) });
        res.json({ ok: true, archived: true });
      } catch (e2) {
        res.status(400).json({ error: e2?.message || error?.message || "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0443\u0434\u0430\u043B\u0438\u0442\u044C \u0430\u0431\u043E\u043D\u0435\u043C\u0435\u043D\u0442" });
      }
    }
  });
  app2.post("/api/mvp/lead-sources", async (req, res) => {
    const payload = req.body || {};
    if (!payload.name || !String(payload.name).trim()) return res.status(400).json({ error: "name is required" });
    if (!supabaseEnabled) return res.status(503).json({ error: "Supabase is not configured" });
    try {
      const inserted = await supabaseFetch("lead_sources", "", {
        method: "POST",
        body: JSON.stringify({ name: String(payload.name).trim(), status: payload.status || "active" })
      });
      res.status(201).json({ source: mapDbLeadSource(inserted[0]) });
    } catch (error) {
      res.status(400).json({ error: error.message || "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0441\u043E\u0437\u0434\u0430\u0442\u044C \u0438\u0441\u0442\u043E\u0447\u043D\u0438\u043A" });
    }
  });
  app2.patch("/api/mvp/lead-sources/:id", async (req, res) => {
    const payload = req.body || {};
    if (!supabaseEnabled) return res.status(503).json({ error: "Supabase is not configured" });
    const updates = {};
    if (payload.name !== void 0) updates.name = String(payload.name).trim();
    if (payload.status !== void 0) updates.status = payload.status;
    if (Object.keys(updates).length === 0) return res.status(400).json({ error: "\u041D\u0435\u0442 \u043F\u043E\u043B\u0435\u0439 \u0434\u043B\u044F \u043E\u0431\u043D\u043E\u0432\u043B\u0435\u043D\u0438\u044F" });
    try {
      const rows = await supabaseFetch("lead_sources", `id=eq.${req.params.id}`, { method: "PATCH", body: JSON.stringify(updates) });
      if (!rows[0]) return res.status(404).json({ error: "\u0418\u0441\u0442\u043E\u0447\u043D\u0438\u043A \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D" });
      res.json({ source: mapDbLeadSource(rows[0]) });
    } catch (error) {
      res.status(400).json({ error: error.message || "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043E\u0431\u043D\u043E\u0432\u0438\u0442\u044C \u0438\u0441\u0442\u043E\u0447\u043D\u0438\u043A" });
    }
  });
  app2.delete("/api/mvp/lead-sources/:id", async (req, res) => {
    if (!supabaseEnabled) return res.status(503).json({ error: "Supabase is not configured" });
    try {
      await supabaseFetch("lead_sources", `id=eq.${req.params.id}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
      res.json({ ok: true });
    } catch (error) {
      res.status(400).json({ error: error.message || "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0443\u0434\u0430\u043B\u0438\u0442\u044C \u0438\u0441\u0442\u043E\u0447\u043D\u0438\u043A" });
    }
  });
  app2.get("/api/cron/parse-dance-events", async (req, res) => {
    const secret = process.env.CRON_SECRET;
    if (secret && req.headers.authorization !== `Bearer ${secret}`) {
      return res.status(401).json({ error: "unauthorized" });
    }
    if (!supabaseEnabled) return res.status(503).json({ error: "Supabase is not configured" });
    try {
      const result = await runParser({ maxMs: 55e3, log: (m) => console.log("[cron dance-events]", m) });
      res.json({ ranAt: (/* @__PURE__ */ new Date()).toISOString(), ...result });
    } catch (error) {
      res.status(500).json({ error: error.message || "\u041F\u0430\u0440\u0441\u0438\u043D\u0433 \u043D\u0435 \u0432\u044B\u043F\u043E\u043B\u043D\u0435\u043D" });
    }
  });
  const authorId = (session) => session.userId.startsWith("demo-") ? null : session.userId;
  app2.get("/api/mvp/notes", async (req, res) => {
    getSession(req);
    if (!supabaseEnabled) return res.status(503).json({ error: "Supabase is not configured" });
    const studentId = String(req.query.studentId || "");
    try {
      const query = studentId ? `select=*&student_id=eq.${studentId}&order=created_at.desc` : `select=*&order=created_at.desc&limit=200`;
      const rows = await supabaseFetch("teacher_notes", query);
      res.json({ notes: rows });
    } catch (error) {
      res.status(400).json({ error: error.message || "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C \u0437\u0430\u043C\u0435\u0442\u043A\u0438" });
    }
  });
  app2.post("/api/mvp/notes", async (req, res) => {
    const session = getSession(req);
    const payload = req.body || {};
    if (!payload.studentId || !String(payload.content || "").trim()) {
      return res.status(400).json({ error: "studentId and content are required" });
    }
    if (!supabaseEnabled) return res.status(503).json({ error: "Supabase is not configured" });
    const kind = ["note", "praise", "concern"].includes(payload.kind) ? payload.kind : "note";
    try {
      const inserted = await supabaseFetch("teacher_notes", "", {
        method: "POST",
        body: JSON.stringify({
          organization_id: session.organizationId,
          branch_id: payload.branchId || session.dbBranchId,
          student_id: payload.studentId,
          author_id: authorId(session),
          kind,
          content: String(payload.content).trim(),
          is_private: Boolean(payload.isPrivate)
        })
      });
      res.status(201).json({ note: inserted[0] });
    } catch (error) {
      res.status(400).json({ error: error.message || "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0434\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u0437\u0430\u043C\u0435\u0442\u043A\u0443" });
    }
  });
  app2.patch("/api/mvp/notes/:id", async (req, res) => {
    getSession(req);
    if (!supabaseEnabled) return res.status(503).json({ error: "Supabase is not configured" });
    const payload = req.body || {};
    const patch = {};
    if (payload.content !== void 0) patch.content = String(payload.content).trim();
    if (payload.kind !== void 0 && ["note", "praise", "concern"].includes(payload.kind)) patch.kind = payload.kind;
    if (payload.isPrivate !== void 0) patch.is_private = Boolean(payload.isPrivate);
    if (Object.keys(patch).length === 0) return res.status(400).json({ error: "\u041D\u0435\u0442 \u043F\u043E\u043B\u0435\u0439 \u0434\u043B\u044F \u043E\u0431\u043D\u043E\u0432\u043B\u0435\u043D\u0438\u044F" });
    try {
      const rows = await supabaseFetch("teacher_notes", `id=eq.${req.params.id}`, {
        method: "PATCH",
        body: JSON.stringify(patch)
      });
      res.json({ note: rows[0] });
    } catch (error) {
      res.status(400).json({ error: error.message || "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043E\u0431\u043D\u043E\u0432\u0438\u0442\u044C \u0437\u0430\u043C\u0435\u0442\u043A\u0443" });
    }
  });
  app2.delete("/api/mvp/notes/:id", async (req, res) => {
    getSession(req);
    if (!supabaseEnabled) return res.status(503).json({ error: "Supabase is not configured" });
    try {
      await supabaseFetch("teacher_notes", `id=eq.${req.params.id}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
      res.json({ ok: true });
    } catch (error) {
      res.status(400).json({ error: error.message || "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0443\u0434\u0430\u043B\u0438\u0442\u044C \u0437\u0430\u043C\u0435\u0442\u043A\u0443" });
    }
  });
  app2.get("/api/mvp/homework", async (req, res) => {
    getSession(req);
    if (!supabaseEnabled) return res.status(503).json({ error: "Supabase is not configured" });
    const { studentId, groupId, status } = req.query;
    const filters = ["select=*", "order=created_at.desc"];
    if (studentId) filters.push(`student_id=eq.${studentId}`);
    if (groupId) filters.push(`group_id=eq.${groupId}`);
    if (status) filters.push(`status=eq.${status}`);
    try {
      const rows = await supabaseFetch("homework", filters.join("&"));
      res.json({ homework: rows });
    } catch (error) {
      res.status(400).json({ error: error.message || "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C \u0437\u0430\u0434\u0430\u043D\u0438\u044F" });
    }
  });
  app2.post("/api/mvp/homework", async (req, res) => {
    const session = getSession(req);
    const payload = req.body || {};
    if (!String(payload.title || "").trim()) return res.status(400).json({ error: "title is required" });
    if (!payload.studentId && !payload.groupId) return res.status(400).json({ error: "studentId or groupId is required" });
    if (!supabaseEnabled) return res.status(503).json({ error: "Supabase is not configured" });
    try {
      const inserted = await supabaseFetch("homework", "", {
        method: "POST",
        body: JSON.stringify({
          organization_id: session.organizationId,
          branch_id: payload.branchId || session.dbBranchId,
          student_id: payload.studentId || null,
          group_id: payload.groupId || null,
          author_id: authorId(session),
          title: String(payload.title).trim(),
          description: payload.description || null,
          video_url: payload.videoUrl || null,
          due_at: payload.dueAt || null,
          status: "assigned"
        })
      });
      res.status(201).json({ homework: inserted[0] });
    } catch (error) {
      res.status(400).json({ error: error.message || "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0432\u044B\u0434\u0430\u0442\u044C \u0437\u0430\u0434\u0430\u043D\u0438\u0435" });
    }
  });
  app2.patch("/api/mvp/homework/:id", async (req, res) => {
    getSession(req);
    if (!supabaseEnabled) return res.status(503).json({ error: "Supabase is not configured" });
    const payload = req.body || {};
    const patch = {};
    if (payload.title !== void 0) patch.title = String(payload.title).trim();
    if (payload.description !== void 0) patch.description = payload.description;
    if (payload.dueAt !== void 0) patch.due_at = payload.dueAt;
    if (payload.videoUrl !== void 0) patch.video_url = payload.videoUrl;
    if (payload.submissionNote !== void 0) patch.submission_note = payload.submissionNote;
    if (payload.submissionVideoUrl !== void 0) patch.submission_video_url = payload.submissionVideoUrl;
    if (payload.gradeComment !== void 0) patch.grade_comment = payload.gradeComment;
    if (payload.status !== void 0 && ["assigned", "submitted", "done", "archived"].includes(payload.status)) {
      patch.status = payload.status;
      if (payload.status === "submitted") patch.submitted_at = (/* @__PURE__ */ new Date()).toISOString();
      if (payload.status === "done") patch.graded_at = (/* @__PURE__ */ new Date()).toISOString();
    }
    if (Object.keys(patch).length === 0) return res.status(400).json({ error: "\u041D\u0435\u0442 \u043F\u043E\u043B\u0435\u0439 \u0434\u043B\u044F \u043E\u0431\u043D\u043E\u0432\u043B\u0435\u043D\u0438\u044F" });
    try {
      const rows = await supabaseFetch("homework", `id=eq.${req.params.id}`, {
        method: "PATCH",
        body: JSON.stringify(patch)
      });
      res.json({ homework: rows[0] });
    } catch (error) {
      res.status(400).json({ error: error.message || "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043E\u0431\u043D\u043E\u0432\u0438\u0442\u044C \u0437\u0430\u0434\u0430\u043D\u0438\u0435" });
    }
  });
  app2.delete("/api/mvp/homework/:id", async (req, res) => {
    getSession(req);
    if (!supabaseEnabled) return res.status(503).json({ error: "Supabase is not configured" });
    try {
      await supabaseFetch("homework", `id=eq.${req.params.id}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
      res.json({ ok: true });
    } catch (error) {
      res.status(400).json({ error: error.message || "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0443\u0434\u0430\u043B\u0438\u0442\u044C \u0437\u0430\u0434\u0430\u043D\u0438\u0435" });
    }
  });
  app2.post("/api/mvp/attendance/bulk", async (req, res) => {
    const session = getSession(req);
    const payload = req.body || {};
    const status = payload.status || "present";
    if (!payload.groupId || !payload.date) {
      return res.status(400).json({ error: "groupId and date are required" });
    }
    if (!["present", "absent", "sick", "excused", "recalc", "trial", "unmarked"].includes(status)) {
      return res.status(400).json({ error: "invalid status" });
    }
    if (!supabaseEnabled) return res.status(503).json({ error: "Supabase is not configured" });
    try {
      const start = (/* @__PURE__ */ new Date(`${payload.date}T00:00:00.000Z`)).toISOString();
      const endDate = /* @__PURE__ */ new Date(`${payload.date}T00:00:00.000Z`);
      endDate.setUTCDate(endDate.getUTCDate() + 1);
      const end = endDate.toISOString();
      let lessons = await supabaseFetch(
        "schedule_lessons",
        `select=*&group_id=eq.${payload.groupId}&starts_at=gte.${encodeURIComponent(start)}&starts_at=lt.${encodeURIComponent(end)}&limit=1`
      );
      let lessonId = lessons[0]?.id;
      if (!lessonId) {
        const groups = await supabaseFetch("groups", `select=*&id=eq.${payload.groupId}&limit=1`);
        const group = groups[0];
        if (!group) return res.status(404).json({ error: "Group not found" });
        if (!canSeeBranch(session, group.branch_id)) return res.status(403).json({ error: "Branch access denied" });
        const created = await supabaseFetch("schedule_lessons", "", {
          method: "POST",
          body: JSON.stringify({
            branch_id: group.branch_id,
            group_id: group.id,
            teacher_id: group.teacher_id || authorId(session),
            starts_at: `${payload.date}T16:00:00.000Z`,
            ends_at: `${payload.date}T17:30:00.000Z`,
            status: "scheduled",
            created_by: authorId(session)
          })
        });
        lessonId = created[0]?.id;
      }
      if (!lessonId) return res.status(500).json({ error: "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043E\u043F\u0440\u0435\u0434\u0435\u043B\u0438\u0442\u044C \u0437\u0430\u043D\u044F\u0442\u0438\u0435" });
      let studentIds = Array.isArray(payload.studentIds) ? payload.studentIds : [];
      if (studentIds.length === 0) {
        const studs = await supabaseFetch("students", `select=id&group_id=eq.${payload.groupId}`);
        studentIds = studs.map((s) => s.id);
      }
      if (studentIds.length === 0) return res.json({ marked: 0, lessonId });
      const rows = studentIds.map((sid) => ({
        lesson_id: lessonId,
        student_id: sid,
        status: status === "unmarked" ? "unknown" : status,
        marked_by: authorId(session),
        marked_at: (/* @__PURE__ */ new Date()).toISOString(),
        absence_reason: payload.absenceReason || null
      }));
      const upserted = await upsertAttendanceRows(rows);
      res.json({ marked: upserted.length, lessonId });
    } catch (error) {
      res.status(400).json({ error: error.message || "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043E\u0442\u043C\u0435\u0442\u0438\u0442\u044C \u0433\u0440\u0443\u043F\u043F\u0443" });
    }
  });
  const SAFE_REACTION_KEYS = [
    "thanks_teacher",
    "liked_lesson",
    "was_interesting",
    "understood_move",
    "got_better",
    "want_more",
    "hard_but_tried"
  ];
  app2.post("/api/mvp/reactions", async (req, res) => {
    const session = getSession(req);
    const payload = req.body || {};
    if (!payload.reactionKey || !SAFE_REACTION_KEYS.includes(payload.reactionKey)) {
      return res.status(400).json({ error: "valid reactionKey is required" });
    }
    if (!supabaseEnabled) return res.status(503).json({ error: "Supabase is not configured" });
    try {
      const inserted = await supabaseFetch("lesson_reactions", "", {
        method: "POST",
        body: JSON.stringify({
          organization_id: session.organizationId,
          branch_id: payload.branchId || session.dbBranchId,
          group_id: payload.groupId || null,
          student_id: payload.studentId || null,
          lesson_id: payload.lessonId || null,
          teacher_id: payload.teacherId || authorId(session),
          reaction_key: payload.reactionKey
        })
      });
      res.status(201).json({ reaction: inserted[0] });
    } catch (error) {
      res.status(400).json({ error: error.message || "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0441\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C \u0440\u0435\u0430\u043A\u0446\u0438\u044E" });
    }
  });
  app2.get("/api/mvp/reactions/summary", async (req, res) => {
    getSession(req);
    if (!supabaseEnabled) return res.status(503).json({ error: "Supabase is not configured" });
    const { from, to, groupId } = req.query;
    const filters = ["select=reaction_key,group_id,created_at"];
    if (from) filters.push(`created_at=gte.${encodeURIComponent(from)}`);
    if (to) filters.push(`created_at=lte.${encodeURIComponent(to)}`);
    if (groupId) filters.push(`group_id=eq.${groupId}`);
    filters.push("limit=5000");
    try {
      const rows = await supabaseFetch("lesson_reactions", filters.join("&"));
      const byKey = {};
      const byGroup = {};
      for (const r of rows) {
        byKey[r.reaction_key] = (byKey[r.reaction_key] || 0) + 1;
        if (r.group_id) byGroup[r.group_id] = (byGroup[r.group_id] || 0) + 1;
      }
      res.json({
        total: rows.length,
        byKey,
        byGroup: Object.entries(byGroup).map(([id, count]) => ({ groupId: id, count }))
      });
    } catch (error) {
      res.status(400).json({ error: error.message || "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C \u0441\u0432\u043E\u0434\u043A\u0443 \u0440\u0435\u0430\u043A\u0446\u0438\u0439" });
    }
  });
  const ACCOUNTING_TYPES = ["income", "expense", "transfer"];
  const monthKey = (d) => String(d).slice(0, 7);
  app2.get("/api/mvp/accounting/overview", async (req, res) => {
    const session = getSession(req);
    if (session.role !== "owner") return res.status(403).json({ error: "\u0420\u0430\u0437\u0434\u0435\u043B \u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D \u0442\u043E\u043B\u044C\u043A\u043E \u0432\u043B\u0430\u0434\u0435\u043B\u044C\u0446\u0443" });
    if (!supabaseEnabled) return res.status(503).json({ error: "Supabase is not configured" });
    const orgFilter = `organization_id=eq.${session.organizationId}`;
    try {
      const [accounts, categories, txns] = await Promise.all([
        supabaseFetch("finance_accounts", `select=*&${orgFilter}&order=sort.asc`),
        supabaseFetch("finance_categories", `select=*&${orgFilter}&order=kind.asc,sort.asc`),
        supabaseFetch("finance_transactions", `select=*&${orgFilter}&type=in.(income,expense)&order=operation_date.asc`)
      ]);
      const actual = txns.filter((t) => (t.status || "actual") === "actual");
      const planned = txns.filter((t) => t.status === "planned");
      const catName = (id) => categories.find((c) => c.id === id)?.name || "\u0411\u0435\u0437 \u0441\u0442\u0430\u0442\u044C\u0438";
      const accName = (id) => accounts.find((a) => a.id === id)?.name || "\u2014";
      const accountsOut = accounts.map((a) => {
        const inc = actual.filter((t) => t.account_id === a.id && t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
        const exp = actual.filter((t) => t.account_id === a.id && t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
        return {
          id: a.id,
          name: a.name,
          kind: a.kind,
          currency: a.currency,
          openingBalance: Number(a.opening_balance),
          balance: Number(a.opening_balance) + inc - exp
        };
      });
      const months = Array.from(new Set(actual.map((t) => monthKey(t.operation_date)))).sort();
      const buildRows = (kind) => {
        const cats = Array.from(new Set(actual.filter((t) => t.type === kind).map((t) => t.category_id)));
        return cats.map((cid) => {
          const byMonth = months.map((m) => actual.filter((t) => t.type === kind && t.category_id === cid && monthKey(t.operation_date) === m).reduce((s, t) => s + Number(t.amount), 0));
          return { category: catName(cid), byMonth, total: byMonth.reduce((s, v) => s + v, 0) };
        }).sort((a, b) => b.total - a.total);
      };
      const incomeRows = buildRows("income");
      const expenseRows = buildRows("expense");
      const incomeByMonth = months.map((m) => actual.filter((t) => t.type === "income" && monthKey(t.operation_date) === m).reduce((s, t) => s + Number(t.amount), 0));
      const expenseByMonth = months.map((m) => actual.filter((t) => t.type === "expense" && monthKey(t.operation_date) === m).reduce((s, t) => s + Number(t.amount), 0));
      const netByMonth = months.map((_, i) => incomeByMonth[i] - expenseByMonth[i]);
      const pnl = months.map((m, i) => ({
        month: m,
        revenue: incomeByMonth[i],
        expense: expenseByMonth[i],
        profit: netByMonth[i],
        margin: incomeByMonth[i] > 0 ? Math.round(netByMonth[i] / incomeByMonth[i] * 100) : 0
      }));
      const calendar = planned.map((t) => ({
        id: t.id,
        date: t.operation_date,
        type: t.type,
        amount: Number(t.amount),
        category: catName(t.category_id),
        account: accName(t.account_id),
        counterparty: t.counterparty || null,
        description: t.description || null
      })).sort((a, b) => a.date.localeCompare(b.date));
      const incomeTotal = incomeByMonth.reduce((s, v) => s + v, 0);
      const expenseTotal = expenseByMonth.reduce((s, v) => s + v, 0);
      const plannedIn = planned.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
      const plannedOut = planned.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
      res.json({
        accounts: accountsOut,
        categories: categories.map((c) => ({ id: c.id, name: c.name, kind: c.kind })),
        cashflow: { months, incomeRows, expenseRows, incomeByMonth, expenseByMonth, netByMonth },
        pnl,
        calendar,
        totals: {
          income: incomeTotal,
          expense: expenseTotal,
          profit: incomeTotal - expenseTotal,
          plannedIn,
          plannedOut,
          balanceTotal: accountsOut.reduce((s, a) => s + a.balance, 0)
        }
      });
    } catch (error) {
      res.status(400).json({ error: error.message || "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C \u0431\u0443\u0445\u0433\u0430\u043B\u0442\u0435\u0440\u0438\u044E" });
    }
  });
  app2.get("/api/mvp/accounting/operations", async (req, res) => {
    const session = getSession(req);
    if (session.role !== "owner") return res.status(403).json({ error: "\u0420\u0430\u0437\u0434\u0435\u043B \u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D \u0442\u043E\u043B\u044C\u043A\u043E \u0432\u043B\u0430\u0434\u0435\u043B\u044C\u0446\u0443" });
    if (!supabaseEnabled) return res.status(503).json({ error: "Supabase is not configured" });
    const orgFilter = `organization_id=eq.${session.organizationId}`;
    const { status, from, to } = req.query;
    const filters = [`select=*`, orgFilter, "type=in.(income,expense)", "order=operation_date.desc"];
    if (status === "actual" || status === "planned") filters.push(`status=eq.${status}`);
    if (from) filters.push(`operation_date=gte.${from}`);
    if (to) filters.push(`operation_date=lte.${to}`);
    filters.push("limit=1000");
    try {
      const rows = await supabaseFetch("finance_transactions", filters.join("&"));
      res.json({ operations: rows.map((t) => ({
        id: t.id,
        type: t.type,
        status: t.status || "actual",
        amount: Number(t.amount),
        date: t.operation_date,
        categoryId: t.category_id,
        accountId: t.account_id,
        counterparty: t.counterparty || null,
        description: t.description || null
      })) });
    } catch (error) {
      res.status(400).json({ error: error.message || "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C \u043E\u043F\u0435\u0440\u0430\u0446\u0438\u0438" });
    }
  });
  app2.post("/api/mvp/accounting/operations", async (req, res) => {
    const session = getSession(req);
    if (session.role !== "owner") return res.status(403).json({ error: "\u0420\u0430\u0437\u0434\u0435\u043B \u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D \u0442\u043E\u043B\u044C\u043A\u043E \u0432\u043B\u0430\u0434\u0435\u043B\u044C\u0446\u0443" });
    if (!supabaseEnabled) return res.status(503).json({ error: "Supabase is not configured" });
    const p = req.body || {};
    const type = ACCOUNTING_TYPES.includes(p.type) ? p.type : "expense";
    const status = p.status === "planned" ? "planned" : "actual";
    const amount = Number(p.amount);
    if (!amount || amount <= 0) return res.status(400).json({ error: "\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u0441\u0443\u043C\u043C\u0443 \u0431\u043E\u043B\u044C\u0448\u0435 \u043D\u0443\u043B\u044F" });
    try {
      const inserted = await supabaseFetch("finance_transactions", "", {
        method: "POST",
        body: JSON.stringify({
          organization_id: session.organizationId,
          branch_id: p.branchId || session.dbBranchId || null,
          account_id: p.accountId || null,
          category_id: p.categoryId || null,
          amount,
          type,
          status,
          operation_date: p.date || (/* @__PURE__ */ new Date()).toISOString().slice(0, 10),
          counterparty: p.counterparty || null,
          description: p.description || null
        })
      });
      res.status(201).json({ operation: inserted[0] });
    } catch (error) {
      res.status(400).json({ error: error.message || "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0441\u043E\u0437\u0434\u0430\u0442\u044C \u043E\u043F\u0435\u0440\u0430\u0446\u0438\u044E" });
    }
  });
  app2.patch("/api/mvp/accounting/operations/:id", async (req, res) => {
    const session = getSession(req);
    if (session.role !== "owner") return res.status(403).json({ error: "\u0420\u0430\u0437\u0434\u0435\u043B \u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D \u0442\u043E\u043B\u044C\u043A\u043E \u0432\u043B\u0430\u0434\u0435\u043B\u044C\u0446\u0443" });
    if (!supabaseEnabled) return res.status(503).json({ error: "Supabase is not configured" });
    const p = req.body || {};
    const patch = { updated_at: (/* @__PURE__ */ new Date()).toISOString() };
    if (p.amount !== void 0) patch.amount = Number(p.amount);
    if (p.type !== void 0 && ACCOUNTING_TYPES.includes(p.type)) patch.type = p.type;
    if (p.status !== void 0) patch.status = p.status === "planned" ? "planned" : "actual";
    if (p.date !== void 0) patch.operation_date = p.date;
    if (p.categoryId !== void 0) patch.category_id = p.categoryId || null;
    if (p.accountId !== void 0) patch.account_id = p.accountId || null;
    if (p.counterparty !== void 0) patch.counterparty = p.counterparty || null;
    if (p.description !== void 0) patch.description = p.description || null;
    try {
      const rows = await supabaseFetch("finance_transactions", `id=eq.${req.params.id}&organization_id=eq.${session.organizationId}`, {
        method: "PATCH",
        body: JSON.stringify(patch)
      });
      res.json({ operation: rows[0] });
    } catch (error) {
      res.status(400).json({ error: error.message || "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043E\u0431\u043D\u043E\u0432\u0438\u0442\u044C \u043E\u043F\u0435\u0440\u0430\u0446\u0438\u044E" });
    }
  });
  app2.delete("/api/mvp/accounting/operations/:id", async (req, res) => {
    const session = getSession(req);
    if (session.role !== "owner") return res.status(403).json({ error: "\u0420\u0430\u0437\u0434\u0435\u043B \u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D \u0442\u043E\u043B\u044C\u043A\u043E \u0432\u043B\u0430\u0434\u0435\u043B\u044C\u0446\u0443" });
    if (!supabaseEnabled) return res.status(503).json({ error: "Supabase is not configured" });
    try {
      await supabaseFetch("finance_transactions", `id=eq.${req.params.id}&organization_id=eq.${session.organizationId}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
      res.json({ ok: true });
    } catch (error) {
      res.status(400).json({ error: error.message || "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0443\u0434\u0430\u043B\u0438\u0442\u044C \u043E\u043F\u0435\u0440\u0430\u0446\u0438\u044E" });
    }
  });
  app2.post("/api/mvp/accounting/accounts", async (req, res) => {
    const session = getSession(req);
    if (session.role !== "owner") return res.status(403).json({ error: "\u0420\u0430\u0437\u0434\u0435\u043B \u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D \u0442\u043E\u043B\u044C\u043A\u043E \u0432\u043B\u0430\u0434\u0435\u043B\u044C\u0446\u0443" });
    if (!supabaseEnabled) return res.status(503).json({ error: "Supabase is not configured" });
    const p = req.body || {};
    if (!String(p.name || "").trim()) return res.status(400).json({ error: "\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 \u0441\u0447\u0451\u0442\u0430" });
    try {
      const inserted = await supabaseFetch("finance_accounts", "", {
        method: "POST",
        body: JSON.stringify({
          organization_id: session.organizationId,
          branch_id: p.branchId || null,
          name: String(p.name).trim(),
          kind: ["cash", "bank", "card"].includes(p.kind) ? p.kind : "cash",
          currency: p.currency || "KZT",
          opening_balance: Number(p.openingBalance) || 0,
          sort: Number(p.sort) || 99
        })
      });
      res.status(201).json({ account: inserted[0] });
    } catch (error) {
      res.status(400).json({ error: error.message || "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0441\u043E\u0437\u0434\u0430\u0442\u044C \u0441\u0447\u0451\u0442" });
    }
  });
  const mapExpenseReq = (r) => ({
    id: r.id,
    branchId: r.branch_id,
    requestedByName: r.requested_by_name,
    amount: Number(r.amount),
    categoryId: r.category_id,
    description: r.description,
    status: r.status,
    decidedBy: r.decided_by,
    decidedAt: r.decided_at,
    decisionComment: r.decision_comment,
    operationId: r.operation_id,
    createdAt: r.created_at
  });
  app2.post("/api/mvp/accounting/expense-requests", async (req, res) => {
    const session = getSession(req);
    if (session.role !== "branch_manager" && session.role !== "owner") {
      return res.status(403).json({ error: "\u041D\u0435\u0434\u043E\u0441\u0442\u0430\u0442\u043E\u0447\u043D\u043E \u043F\u0440\u0430\u0432" });
    }
    if (!supabaseEnabled) return res.status(503).json({ error: "Supabase is not configured" });
    const p = req.body || {};
    const amount = Number(p.amount);
    if (!amount || amount <= 0) return res.status(400).json({ error: "\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u0441\u0443\u043C\u043C\u0443 \u0431\u043E\u043B\u044C\u0448\u0435 \u043D\u0443\u043B\u044F" });
    try {
      const inserted = await supabaseFetch("finance_expense_requests", "", {
        method: "POST",
        body: JSON.stringify({
          organization_id: session.organizationId,
          branch_id: p.branchId || session.dbBranchId || null,
          requested_by: authorId(session),
          requested_by_name: session.fullName || session.role,
          amount,
          category_id: p.categoryId || null,
          description: p.description || null,
          status: "pending"
        })
      });
      res.status(201).json({ request: mapExpenseReq(inserted[0]) });
    } catch (error) {
      res.status(400).json({ error: error.message || "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0441\u043E\u0437\u0434\u0430\u0442\u044C \u0437\u0430\u044F\u0432\u043A\u0443" });
    }
  });
  app2.get("/api/mvp/accounting/expense-requests", async (req, res) => {
    const session = getSession(req);
    if (session.role !== "branch_manager" && session.role !== "owner") {
      return res.status(403).json({ error: "\u041D\u0435\u0434\u043E\u0441\u0442\u0430\u0442\u043E\u0447\u043D\u043E \u043F\u0440\u0430\u0432" });
    }
    if (!supabaseEnabled) return res.status(503).json({ error: "Supabase is not configured" });
    const filters = [`select=*`, `organization_id=eq.${session.organizationId}`, "order=created_at.desc", "limit=500"];
    if (session.role === "branch_manager") filters.push(`branch_id=eq.${session.dbBranchId}`);
    if (req.query.status) filters.push(`status=eq.${req.query.status}`);
    try {
      const rows = await supabaseFetch("finance_expense_requests", filters.join("&"));
      res.json({ requests: rows.map(mapExpenseReq) });
    } catch (error) {
      res.status(400).json({ error: error.message || "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C \u0437\u0430\u044F\u0432\u043A\u0438" });
    }
  });
  app2.post("/api/mvp/accounting/expense-requests/:id/approve", async (req, res) => {
    const session = getSession(req);
    if (session.role !== "owner") return res.status(403).json({ error: "\u041F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0430\u0442\u044C \u043C\u043E\u0436\u0435\u0442 \u0442\u043E\u043B\u044C\u043A\u043E \u0432\u043B\u0430\u0434\u0435\u043B\u0435\u0446" });
    if (!supabaseEnabled) return res.status(503).json({ error: "Supabase is not configured" });
    const p = req.body || {};
    try {
      const found = await supabaseFetch("finance_expense_requests", `select=*&id=eq.${req.params.id}&organization_id=eq.${session.organizationId}`);
      const reqRow = found[0];
      if (!reqRow) return res.status(404).json({ error: "\u0417\u0430\u044F\u0432\u043A\u0430 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u0430" });
      if (reqRow.status !== "pending") return res.status(400).json({ error: "\u0417\u0430\u044F\u0432\u043A\u0430 \u0443\u0436\u0435 \u043E\u0431\u0440\u0430\u0431\u043E\u0442\u0430\u043D\u0430" });
      const categoryId = p.categoryId || reqRow.category_id || null;
      const op = await supabaseFetch("finance_transactions", "", {
        method: "POST",
        body: JSON.stringify({
          organization_id: session.organizationId,
          branch_id: reqRow.branch_id,
          account_id: p.accountId || null,
          category_id: categoryId,
          amount: reqRow.amount,
          type: "expense",
          status: "actual",
          operation_date: p.date || (/* @__PURE__ */ new Date()).toISOString().slice(0, 10),
          description: reqRow.description ? `\u0417\u0430\u044F\u0432\u043A\u0430: ${reqRow.description}` : "\u041E\u0434\u043E\u0431\u0440\u0435\u043D\u043D\u0430\u044F \u0437\u0430\u044F\u0432\u043A\u0430 \u043D\u0430 \u0440\u0430\u0441\u0445\u043E\u0434"
        })
      });
      const rows = await supabaseFetch("finance_expense_requests", `id=eq.${req.params.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          status: "approved",
          decided_by: session.fullName || "owner",
          decided_at: (/* @__PURE__ */ new Date()).toISOString(),
          decision_comment: p.comment || null,
          category_id: categoryId,
          operation_id: op[0]?.id || null
        })
      });
      res.json({ request: mapExpenseReq(rows[0]) });
    } catch (error) {
      res.status(400).json({ error: error.message || "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043E\u0434\u043E\u0431\u0440\u0438\u0442\u044C \u0437\u0430\u044F\u0432\u043A\u0443" });
    }
  });
  app2.post("/api/mvp/accounting/expense-requests/:id/reject", async (req, res) => {
    const session = getSession(req);
    if (session.role !== "owner") return res.status(403).json({ error: "\u041E\u0442\u043A\u043B\u043E\u043D\u044F\u0442\u044C \u043C\u043E\u0436\u0435\u0442 \u0442\u043E\u043B\u044C\u043A\u043E \u0432\u043B\u0430\u0434\u0435\u043B\u0435\u0446" });
    if (!supabaseEnabled) return res.status(503).json({ error: "Supabase is not configured" });
    const p = req.body || {};
    try {
      const rows = await supabaseFetch("finance_expense_requests", `id=eq.${req.params.id}&organization_id=eq.${session.organizationId}&status=eq.pending`, {
        method: "PATCH",
        body: JSON.stringify({
          status: "rejected",
          decided_by: session.fullName || "owner",
          decided_at: (/* @__PURE__ */ new Date()).toISOString(),
          decision_comment: p.comment || null
        })
      });
      if (!rows[0]) return res.status(400).json({ error: "\u0417\u0430\u044F\u0432\u043A\u0430 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u0430 \u0438\u043B\u0438 \u0443\u0436\u0435 \u043E\u0431\u0440\u0430\u0431\u043E\u0442\u0430\u043D\u0430" });
      res.json({ request: mapExpenseReq(rows[0]) });
    } catch (error) {
      res.status(400).json({ error: error.message || "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043E\u0442\u043A\u043B\u043E\u043D\u0438\u0442\u044C \u0437\u0430\u044F\u0432\u043A\u0443" });
    }
  });
  const isoDay = (dt) => `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
  const periodRanges = (period, cs, ce) => {
    const base = /* @__PURE__ */ new Date();
    base.setHours(0, 0, 0, 0);
    const mk = (s, e) => ({ start: isoDay(s), end: isoDay(e) });
    const Y = base.getFullYear(), M = base.getMonth();
    switch (period) {
      case "today": {
        const p = new Date(base);
        p.setDate(p.getDate() - 1);
        const y = new Date(base);
        y.setFullYear(y.getFullYear() - 1);
        return { cur: mk(base, base), prev: mk(p, p), yoy: mk(y, y) };
      }
      case "yesterday": {
        const c = new Date(base);
        c.setDate(c.getDate() - 1);
        const p = new Date(c);
        p.setDate(p.getDate() - 1);
        const y = new Date(c);
        y.setFullYear(y.getFullYear() - 1);
        return { cur: mk(c, c), prev: mk(p, p), yoy: mk(y, y) };
      }
      case "week": {
        const e = new Date(base);
        const s = new Date(base);
        s.setDate(s.getDate() - 6);
        const pe = new Date(s);
        pe.setDate(pe.getDate() - 1);
        const ps = new Date(pe);
        ps.setDate(ps.getDate() - 6);
        const ys = new Date(s);
        ys.setFullYear(ys.getFullYear() - 1);
        const ye = new Date(e);
        ye.setFullYear(ye.getFullYear() - 1);
        return { cur: mk(s, e), prev: mk(ps, pe), yoy: mk(ys, ye) };
      }
      case "quarter": {
        const q = Math.floor(M / 3);
        return {
          cur: mk(new Date(Y, q * 3, 1), new Date(Y, q * 3 + 3, 0)),
          prev: mk(new Date(Y, q * 3 - 3, 1), new Date(Y, q * 3, 0)),
          yoy: mk(new Date(Y - 1, q * 3, 1), new Date(Y - 1, q * 3 + 3, 0))
        };
      }
      case "year":
        return {
          cur: mk(new Date(Y, 0, 1), new Date(Y, 11, 31)),
          prev: mk(new Date(Y - 1, 0, 1), new Date(Y - 1, 11, 31)),
          yoy: mk(new Date(Y - 1, 0, 1), new Date(Y - 1, 11, 31))
        };
      case "custom": {
        if (cs && ce) {
          const s = new Date(cs);
          const e = new Date(ce);
          const len = Math.max(1, Math.round((e.getTime() - s.getTime()) / 864e5) + 1);
          const pe = new Date(s);
          pe.setDate(pe.getDate() - 1);
          const ps = new Date(pe);
          ps.setDate(ps.getDate() - len + 1);
          const ys = new Date(s);
          ys.setFullYear(ys.getFullYear() - 1);
          const ye = new Date(e);
          ye.setFullYear(ye.getFullYear() - 1);
          return { cur: mk(s, e), prev: mk(ps, pe), yoy: mk(ys, ye) };
        }
      }
      default:
        return {
          cur: mk(new Date(Y, M, 1), new Date(Y, M + 1, 0)),
          prev: mk(new Date(Y, M - 1, 1), new Date(Y, M, 0)),
          yoy: mk(new Date(Y - 1, M, 1), new Date(Y - 1, M + 1, 0))
        };
    }
  };
  const inRange = (d, r) => d >= r.start && d <= r.end;
  const pctDelta = (cur, base) => base > 0 ? Math.round((cur - base) / base * 1e3) / 10 : null;
  const todayStr = () => isoDay(/* @__PURE__ */ new Date());
  const uid = () => globalThis.crypto?.randomUUID?.() || `id-${Math.random().toString(36).slice(2)}`;
  const mockPerformances = [
    {
      id: uid(),
      clientName: "\u0421\u0432\u0430\u0434\u044C\u0431\u0430 \u0410\u0439\u0441\u0443\u043B\u0443 \u0438 \u041C\u0430\u043A\u0441\u0430\u0442",
      clientPhone: "+7 701 555 0001",
      address: "\u0420\u0435\u0441\u0442\u043E\u0440\u0430\u043D \xAB\u0417\u0435\u0440\u0434\u044D\xBB, \u0433. \u0410\u0441\u0442\u0430\u043D\u0430",
      eventDate: "2026-06-01",
      eventTime: "18:00",
      type: "interactive",
      price: 35e4,
      status: "planned",
      comment: "3 \u043D\u043E\u043C\u0435\u0440\u0430 + \u0438\u043D\u0442\u0435\u0440\u0430\u043A\u0442\u0438\u0432 \u0441 \u0433\u043E\u0441\u0442\u044F\u043C\u0438",
      branchId: demoBranchAlmaty,
      payments: [{ id: uid(), amount: 1e5, paidDate: "2026-05-28", method: "cash", comment: "\u0410\u0432\u0430\u043D\u0441" }, { id: uid(), amount: 15e4, paidDate: "2026-06-01", method: "transfer", comment: "\u0414\u043E\u043F\u043B\u0430\u0442\u0430" }]
    },
    {
      id: uid(),
      clientName: "\u041A\u043E\u0440\u043F\u043E\u0440\u0430\u0442\u0438\u0432 BI Group",
      clientPhone: "+7 701 555 0002",
      address: "\u041E\u0442\u0435\u043B\u044C Rixos",
      eventDate: "2026-06-05",
      eventTime: "20:00",
      type: "basic",
      price: 3e5,
      status: "planned",
      comment: "\u0411\u0430\u0437\u043E\u0432\u044B\u0439 \u0442\u0430\u043D\u0435\u0446",
      branchId: demoBranchAlmaty,
      payments: [{ id: uid(), amount: 3e5, paidDate: "2026-06-05", method: "transfer", comment: "\u041F\u043E\u043B\u043D\u0430\u044F \u043E\u043F\u043B\u0430\u0442\u0430" }]
    },
    { id: uid(), clientName: "\u0411\u0430\u043D\u043A\u0435\u0442 \u041D\u0443\u0440\u043B\u0430\u043D", clientPhone: "+7 701 555 0003", address: "\u0411\u0430\u043D\u043A\u0435\u0442\u043D\u044B\u0439 \u0437\u0430\u043B \xAB\u0410\u0441\u0442\u0430\u043D\u0430\xBB", eventDate: "2026-06-10", eventTime: "19:00", type: "interactive", price: 2e5, status: "planned", comment: "\u0422\u0430\u043D\u0435\u0446 \u0441 \u0438\u043D\u0442\u0435\u0440\u0430\u043A\u0442\u0438\u0432\u043E\u043C", branchId: demoBranchAlmaty, payments: [] }
  ];
  const mockProducts = [
    { id: uid(), name: "\u0424\u0443\u0442\u0431\u043E\u043B\u043A\u0430 ECHO GOR", category: "\u041C\u0435\u0440\u0447", sku: "TSH-001", salePrice: 15e3, costPrice: 8e3, minStock: 10, branchId: demoBranchAlmaty, echoPrice: 500, isActive: true, description: "\u0424\u0438\u0440\u043C\u0435\u043D\u043D\u0430\u044F \u0444\u0443\u0442\u0431\u043E\u043B\u043A\u0430 \u0430\u043D\u0441\u0430\u043C\u0431\u043B\u044F. \u041C\u044F\u0433\u043A\u0438\u0439 \u0445\u043B\u043E\u043F\u043E\u043A, \u043B\u043E\u0433\u043E\u0442\u0438\u043F \u043D\u0430 \u0433\u0440\u0443\u0434\u0438." },
    { id: uid(), name: "\u0425\u0443\u0434\u0438 ECHO GOR", category: "\u041C\u0435\u0440\u0447", sku: "HOD-002", salePrice: 28e3, costPrice: 16e3, minStock: 5, branchId: demoBranchAlmaty, echoPrice: 1200, isActive: true, description: "\u0422\u0451\u043F\u043B\u043E\u0435 \u0445\u0443\u0434\u0438 \u0441 \u0432\u044B\u0448\u0438\u0432\u043A\u043E\u0439 \u0430\u043D\u0441\u0430\u043C\u0431\u043B\u044F \u2014 \u043D\u0430\u0433\u0440\u0430\u0434\u0430 \u0437\u0430 \u0443\u043F\u043E\u0440\u0441\u0442\u0432\u043E." },
    { id: uid(), name: "\u0428\u0442\u0430\u043D\u044B \u0442\u0440\u0435\u043D\u0438\u0440\u043E\u0432\u043E\u0447\u043D\u044B\u0435", category: "\u0424\u043E\u0440\u043C\u0430", sku: "PNT-003", salePrice: 2e4, costPrice: 12e3, minStock: 5, branchId: demoBranchAlmaty, echoPrice: 0, isActive: true, description: "\u0422\u0440\u0435\u043D\u0438\u0440\u043E\u0432\u043E\u0447\u043D\u044B\u0435 \u0448\u0442\u0430\u043D\u044B \u0434\u043B\u044F \u0437\u0430\u043D\u044F\u0442\u0438\u0439." },
    { id: uid(), name: "\u0428\u0430\u043F\u043A\u0430 ECHO GOR", category: "\u041C\u0435\u0440\u0447", sku: "CAP-004", salePrice: 7e3, costPrice: 3500, minStock: 5, branchId: demoBranchAlmaty, echoPrice: 300, isActive: true, description: "\u0421\u0442\u0438\u043B\u044C\u043D\u0430\u044F \u0448\u0430\u043F\u043A\u0430 \u0441 \u043B\u043E\u0433\u043E\u0442\u0438\u043F\u043E\u043C \u2014 \u043F\u0440\u0438\u044F\u0442\u043D\u044B\u0439 \u0431\u043E\u043D\u0443\u0441 \u0437\u0430 \u0431\u0430\u043B\u043B\u044B." }
  ];
  const mockReceipts = [
    { id: uid(), productId: mockProducts[0].id, qty: 30, costPrice: 8e3, movementDate: "2026-05-01", comment: "\u0417\u0430\u043A\u0443\u043F \u043F\u0430\u0440\u0442\u0438\u0438", branchId: demoBranchAlmaty },
    { id: uid(), productId: mockProducts[1].id, qty: 20, costPrice: 16e3, movementDate: "2026-05-01", comment: "\u0417\u0430\u043A\u0443\u043F \u043F\u0430\u0440\u0442\u0438\u0438", branchId: demoBranchAlmaty },
    { id: uid(), productId: mockProducts[2].id, qty: 12, costPrice: 12e3, movementDate: "2026-05-01", comment: "\u0417\u0430\u043A\u0443\u043F \u043F\u0430\u0440\u0442\u0438\u0438", branchId: demoBranchAlmaty },
    { id: uid(), productId: mockProducts[3].id, qty: 8, costPrice: 3500, movementDate: "2026-05-01", comment: "\u0417\u0430\u043A\u0443\u043F \u043F\u0430\u0440\u0442\u0438\u0438", branchId: demoBranchAlmaty }
  ];
  const mockSales = [
    { id: uid(), productId: mockProducts[0].id, qty: 7, amount: 105e3, method: "card", soldBy: "\u0424\u0430\u0442\u0438\u043C\u0430 \u0426\u0430\u0440\u0438\u043A\u0430\u0435\u0432\u0430", saleDate: "2026-06-03", branchId: demoBranchAlmaty },
    { id: uid(), productId: mockProducts[1].id, qty: 8, amount: 224e3, method: "kaspi", soldBy: "\u0424\u0430\u0442\u0438\u043C\u0430 \u0426\u0430\u0440\u0438\u043A\u0430\u0435\u0432\u0430", saleDate: "2026-06-08", branchId: demoBranchAlmaty },
    { id: uid(), productId: mockProducts[2].id, qty: 4, amount: 8e4, method: "cash", soldBy: "\u0424\u0430\u0442\u0438\u043C\u0430 \u0426\u0430\u0440\u0438\u043A\u0430\u0435\u0432\u0430", saleDate: "2026-06-12", branchId: demoBranchAlmaty },
    { id: uid(), productId: mockProducts[3].id, qty: 6, amount: 42e3, method: "cash", soldBy: "\u0424\u0430\u0442\u0438\u043C\u0430 \u0426\u0430\u0440\u0438\u043A\u0430\u0435\u0432\u0430", saleDate: "2026-06-15", branchId: demoBranchAlmaty }
  ];
  const PERF_TYPES = ["basic", "interactive", "multi", "individual", "other"];
  const perfOut = (perf, payments) => {
    const paid = payments.reduce((s, p) => s + Number(p.amount), 0);
    const price = Number(perf.price) || 0;
    const expense = Number(perf.expense ?? 0) || 0;
    const cancelled = (perf.status || perf.status) === "cancelled";
    const status = cancelled ? "cancelled" : paid <= 0 ? "planned" : paid >= price && price > 0 ? "paid" : "partial";
    return {
      id: perf.id,
      clientName: perf.clientName ?? perf.client_name,
      clientPhone: perf.clientPhone ?? perf.client_phone ?? null,
      address: perf.address ?? null,
      eventDate: perf.eventDate ?? perf.event_date,
      eventTime: perf.eventTime ?? perf.event_time ?? null,
      type: perf.type || "basic",
      typeLabel: perf.typeLabel ?? perf.type_label ?? null,
      performersCount: perf.performersCount ?? perf.performers_count ?? null,
      paymentMethod: perf.paymentMethod ?? perf.payment_method ?? null,
      price,
      paid,
      outstanding: Math.max(0, price - paid),
      expense,
      netProfit: price - expense,
      // чистая прибыль (на счёт поступает только она)
      status,
      comment: perf.comment ?? null,
      branchId: perf.branchId ?? perf.branch_id ?? null,
      payments: payments.map((p) => ({ id: p.id, amount: Number(p.amount), date: p.paidDate ?? p.paid_date, method: p.method || "cash", comment: p.comment ?? null })).sort((a, b) => String(a.date).localeCompare(String(b.date)))
    };
  };
  const loadPerformances = async (session) => {
    if (!supabaseEnabled) {
      const list = session.role === "owner" ? mockPerformances : mockPerformances.filter((p) => canSeeBranch(session, p.branchId));
      return list.map((p) => perfOut(p, p.payments || []));
    }
    const orgFilter = `organization_id=eq.${session.organizationId}`;
    const [perfs, pays] = await Promise.all([
      supabaseFetch("performances", `select=*&${orgFilter}&order=event_date.desc`),
      supabaseFetch("performance_payments", `select=*&${orgFilter}&order=paid_date.asc`)
    ]);
    return perfs.map((perf) => perfOut(perf, pays.filter((pp) => pp.performance_id === perf.id)));
  };
  app2.get("/api/mvp/performances", ah(async (req, res) => {
    const session = getSession(req);
    if (session.role !== "owner" && session.role !== "branch_manager") {
      return res.status(403).json({ error: "\u0420\u0430\u0437\u0434\u0435\u043B \u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D \u0432\u043B\u0430\u0434\u0435\u043B\u044C\u0446\u0443 \u0438 \u0443\u043F\u0440\u0430\u0432\u043B\u044F\u044E\u0449\u0435\u043C\u0443" });
    }
    let list = await loadPerformances(session);
    const { status } = req.query;
    if (status && status !== "all") list = list.filter((p) => p.status === status);
    if (session.role === "branch_manager") {
      list = list.map((p) => ({ ...p, paid: null, outstanding: null, payments: [] }));
    }
    res.json({ performances: list });
  }));
  app2.get("/api/mvp/performances/overview", ah(async (req, res) => {
    const session = getSession(req);
    if (session.role !== "owner") return res.status(403).json({ error: "\u0410\u043D\u0430\u043B\u0438\u0442\u0438\u043A\u0430 \u0434\u043E\u0441\u0442\u0443\u043F\u043D\u0430 \u0432\u043B\u0430\u0434\u0435\u043B\u044C\u0446\u0443" });
    const q = req.query;
    const r = periodRanges(q.period, q.from, q.to);
    const list = (await loadPerformances(session)).filter((p) => p.status !== "cancelled");
    const allPays = list.flatMap((p) => p.payments.map((pay) => ({ ...pay })));
    const sumIn = (range) => allPays.filter((pp) => inRange(pp.date, range)).reduce((s, pp) => s + pp.amount, 0);
    const curRev = sumIn(r.cur), prevRev = sumIn(r.prev), yoyRev = sumIn(r.yoy);
    const inCur = list.filter((p) => inRange(p.eventDate, r.cur));
    const count = inCur.length;
    const grossCur = inCur.reduce((s, p) => s + p.price, 0);
    const expenseCur = inCur.reduce((s, p) => s + (p.expense || 0), 0);
    const netCur = grossCur - expenseCur;
    const performersCur = inCur.reduce((s, p) => s + (p.performersCount || 0), 0);
    const avgCheck = count > 0 ? Math.round(grossCur / count) : 0;
    const unpaid = list.filter((p) => p.outstanding > 0);
    const outstanding = unpaid.reduce((s, p) => s + p.outstanding, 0);
    const months = [];
    const md = /* @__PURE__ */ new Date();
    md.setDate(1);
    for (let i = 5; i >= 0; i--) {
      const d = new Date(md.getFullYear(), md.getMonth() - i, 1);
      months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    }
    const byMonth = months.map((mo) => ({ month: mo, amount: allPays.filter((pp) => String(pp.date).slice(0, 7) === mo).reduce((s, pp) => s + pp.amount, 0) }));
    res.json({
      revenue: { total: curRev, momPct: pctDelta(curRev, prevRev), yoyPct: pctDelta(curRev, yoyRev) },
      count,
      avgCheck,
      unpaidCount: unpaid.length,
      outstanding,
      byMonth,
      gross: grossCur,
      expense: expenseCur,
      netProfit: netCur,
      performers: performersCur
    });
  }));
  app2.get("/api/mvp/performances/:id", ah(async (req, res) => {
    const session = getSession(req);
    if (session.role !== "owner") return res.status(403).json({ error: "\u0424\u0438\u043D\u0430\u043D\u0441\u043E\u0432\u0430\u044F \u043A\u0430\u0440\u0442\u043E\u0447\u043A\u0430 \u0434\u043E\u0441\u0442\u0443\u043F\u043D\u0430 \u0432\u043B\u0430\u0434\u0435\u043B\u044C\u0446\u0443" });
    const list = await loadPerformances(session);
    const found = list.find((p) => p.id === req.params.id);
    if (!found) return res.status(404).json({ error: "\u0412\u044B\u0441\u0442\u0443\u043F\u043B\u0435\u043D\u0438\u0435 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u043E" });
    res.json({ performance: found });
  }));
  app2.post("/api/mvp/performances", ah(async (req, res) => {
    const session = getSession(req);
    if (session.role !== "owner") return res.status(403).json({ error: "\u0421\u043E\u0437\u0434\u0430\u0432\u0430\u0442\u044C \u043C\u043E\u0436\u0435\u0442 \u0442\u043E\u043B\u044C\u043A\u043E \u0432\u043B\u0430\u0434\u0435\u043B\u0435\u0446" });
    const p = req.body || {};
    if (!String(p.clientName || "").trim()) return res.status(400).json({ error: "\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u043A\u043B\u0438\u0435\u043D\u0442\u0430" });
    const eventDate = p.eventDate || p.date || todayStr();
    const type = p.type ? String(p.type) : "basic";
    const price = Number(p.price) || 0;
    const expense = Number(p.expense) || 0;
    const performersCount = p.performersCount != null && p.performersCount !== "" ? Math.max(0, parseInt(p.performersCount, 10)) || 0 : null;
    const paymentMethod = p.paymentMethod || null;
    const markPaid = p.status === "paid";
    if (!supabaseEnabled) {
      const payments = markPaid && price > 0 ? [{ id: uid(), amount: price, paidDate: eventDate, method: paymentMethod || "cash", comment: null }] : [];
      const rec = {
        id: uid(),
        clientName: String(p.clientName).trim(),
        clientPhone: p.clientPhone || null,
        address: p.address || null,
        eventDate,
        eventTime: p.eventTime || null,
        type,
        typeLabel: p.typeLabel || null,
        price,
        expense,
        performersCount,
        paymentMethod,
        status: "planned",
        comment: p.comment || null,
        branchId: p.branchId || session.dbBranchId || demoBranchAlmaty,
        payments
      };
      mockPerformances.unshift(rec);
      return res.status(201).json({ performance: perfOut(rec, payments) });
    }
    const inserted = await supabaseFetch("performances", "", {
      method: "POST",
      body: JSON.stringify({
        organization_id: session.organizationId,
        branch_id: p.branchId || session.dbBranchId || null,
        client_name: String(p.clientName).trim(),
        client_phone: p.clientPhone || null,
        address: p.address || null,
        event_date: eventDate,
        event_time: p.eventTime || null,
        type,
        type_label: p.typeLabel || null,
        price,
        expense,
        performers_count: performersCount,
        payment_method: paymentMethod,
        status: "planned",
        comment: p.comment || null
      })
    });
    let pays = [];
    if (markPaid && price > 0 && inserted[0]) {
      await supabaseFetch("performance_payments", "", {
        method: "POST",
        body: JSON.stringify({ organization_id: session.organizationId, performance_id: inserted[0].id, amount: price, paid_date: eventDate, method: paymentMethod || "cash", comment: "\u041E\u043F\u043B\u0430\u0442\u0430 \u043F\u0440\u0438 \u0441\u043E\u0437\u0434\u0430\u043D\u0438\u0438" })
      });
      pays = await supabaseFetch("performance_payments", `select=*&performance_id=eq.${inserted[0].id}`);
    }
    res.status(201).json({ performance: perfOut(inserted[0], pays) });
  }));
  app2.patch("/api/mvp/performances/:id", ah(async (req, res) => {
    const session = getSession(req);
    if (session.role !== "owner") return res.status(403).json({ error: "\u0418\u0437\u043C\u0435\u043D\u044F\u0442\u044C \u043C\u043E\u0436\u0435\u0442 \u0442\u043E\u043B\u044C\u043A\u043E \u0432\u043B\u0430\u0434\u0435\u043B\u0435\u0446" });
    const p = req.body || {};
    if (!supabaseEnabled) {
      const rec = mockPerformances.find((x) => x.id === req.params.id);
      if (!rec) return res.status(404).json({ error: "\u0412\u044B\u0441\u0442\u0443\u043F\u043B\u0435\u043D\u0438\u0435 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u043E" });
      if (p.clientName !== void 0) rec.clientName = p.clientName;
      if (p.clientPhone !== void 0) rec.clientPhone = p.clientPhone;
      if (p.address !== void 0) rec.address = p.address;
      if (p.eventDate !== void 0) rec.eventDate = p.eventDate;
      if (p.eventTime !== void 0) rec.eventTime = p.eventTime;
      if (p.type !== void 0) rec.type = p.type;
      if (p.typeLabel !== void 0) rec.typeLabel = p.typeLabel || null;
      if (p.price !== void 0) rec.price = Number(p.price) || 0;
      if (p.expense !== void 0) rec.expense = Number(p.expense) || 0;
      if (p.performersCount !== void 0) rec.performersCount = p.performersCount === "" || p.performersCount == null ? null : Math.max(0, parseInt(p.performersCount, 10)) || 0;
      if (p.paymentMethod !== void 0) rec.paymentMethod = p.paymentMethod || null;
      if (p.status !== void 0) rec.status = p.status === "cancelled" ? "cancelled" : "planned";
      if (p.comment !== void 0) rec.comment = p.comment;
      return res.json({ performance: perfOut(rec, rec.payments || []) });
    }
    const patch = { updated_at: (/* @__PURE__ */ new Date()).toISOString() };
    if (p.clientName !== void 0) patch.client_name = p.clientName;
    if (p.clientPhone !== void 0) patch.client_phone = p.clientPhone || null;
    if (p.address !== void 0) patch.address = p.address || null;
    if (p.eventDate !== void 0) patch.event_date = p.eventDate;
    if (p.eventTime !== void 0) patch.event_time = p.eventTime || null;
    if (p.type !== void 0) patch.type = p.type;
    if (p.typeLabel !== void 0) patch.type_label = p.typeLabel || null;
    if (p.price !== void 0) patch.price = Number(p.price) || 0;
    if (p.expense !== void 0) patch.expense = Number(p.expense) || 0;
    if (p.performersCount !== void 0) patch.performers_count = p.performersCount === "" || p.performersCount == null ? null : Math.max(0, parseInt(p.performersCount, 10)) || 0;
    if (p.paymentMethod !== void 0) patch.payment_method = p.paymentMethod || null;
    if (p.status !== void 0) patch.status = p.status === "cancelled" ? "cancelled" : "planned";
    if (p.comment !== void 0) patch.comment = p.comment || null;
    const rows = await supabaseFetch("performances", `id=eq.${req.params.id}&organization_id=eq.${session.organizationId}`, { method: "PATCH", body: JSON.stringify(patch) });
    const pays = await supabaseFetch("performance_payments", `select=*&performance_id=eq.${req.params.id}`);
    res.json({ performance: rows[0] ? perfOut(rows[0], pays) : null });
  }));
  app2.delete("/api/mvp/performances/:id", ah(async (req, res) => {
    const session = getSession(req);
    if (session.role !== "owner") return res.status(403).json({ error: "\u0423\u0434\u0430\u043B\u044F\u0442\u044C \u043C\u043E\u0436\u0435\u0442 \u0442\u043E\u043B\u044C\u043A\u043E \u0432\u043B\u0430\u0434\u0435\u043B\u0435\u0446" });
    if (!supabaseEnabled) {
      const i = mockPerformances.findIndex((x) => x.id === req.params.id);
      if (i >= 0) mockPerformances.splice(i, 1);
      return res.json({ ok: true });
    }
    await supabaseFetch("performances", `id=eq.${req.params.id}&organization_id=eq.${session.organizationId}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
    res.json({ ok: true });
  }));
  app2.post("/api/mvp/performances/:id/payments", ah(async (req, res) => {
    const session = getSession(req);
    if (session.role !== "owner") return res.status(403).json({ error: "\u0414\u043E\u0431\u0430\u0432\u043B\u044F\u0442\u044C \u043E\u043F\u043B\u0430\u0442\u0443 \u043C\u043E\u0436\u0435\u0442 \u0442\u043E\u043B\u044C\u043A\u043E \u0432\u043B\u0430\u0434\u0435\u043B\u0435\u0446" });
    const p = req.body || {};
    const amount = Number(p.amount);
    if (!amount || amount <= 0) return res.status(400).json({ error: "\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u0441\u0443\u043C\u043C\u0443 \u0431\u043E\u043B\u044C\u0448\u0435 \u043D\u0443\u043B\u044F" });
    if (!supabaseEnabled) {
      const rec = mockPerformances.find((x) => x.id === req.params.id);
      if (!rec) return res.status(404).json({ error: "\u0412\u044B\u0441\u0442\u0443\u043F\u043B\u0435\u043D\u0438\u0435 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u043E" });
      rec.payments = rec.payments || [];
      rec.payments.push({ id: uid(), amount, paidDate: p.date || todayStr(), method: p.method || "cash", comment: p.comment || null });
      return res.status(201).json({ performance: perfOut(rec, rec.payments) });
    }
    await supabaseFetch("performance_payments", "", {
      method: "POST",
      body: JSON.stringify({ organization_id: session.organizationId, performance_id: req.params.id, amount, paid_date: p.date || todayStr(), method: p.method || "cash", comment: p.comment || null })
    });
    const [rows, pays] = await Promise.all([
      supabaseFetch("performances", `select=*&id=eq.${req.params.id}`),
      supabaseFetch("performance_payments", `select=*&performance_id=eq.${req.params.id}`)
    ]);
    res.status(201).json({ performance: rows[0] ? perfOut(rows[0], pays) : null });
  }));
  app2.delete("/api/mvp/performances/:id/payments/:pid", ah(async (req, res) => {
    const session = getSession(req);
    if (session.role !== "owner") return res.status(403).json({ error: "\u0414\u043E\u0441\u0442\u0443\u043F\u043D\u043E \u0442\u043E\u043B\u044C\u043A\u043E \u0432\u043B\u0430\u0434\u0435\u043B\u044C\u0446\u0443" });
    if (!supabaseEnabled) {
      const rec = mockPerformances.find((x) => x.id === req.params.id);
      if (rec) rec.payments = (rec.payments || []).filter((pp) => pp.id !== req.params.pid);
      return res.json({ performance: rec ? perfOut(rec, rec.payments || []) : null });
    }
    await supabaseFetch("performance_payments", `id=eq.${req.params.pid}&organization_id=eq.${session.organizationId}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
    const [rows, pays] = await Promise.all([
      supabaseFetch("performances", `select=*&id=eq.${req.params.id}`),
      supabaseFetch("performance_payments", `select=*&performance_id=eq.${req.params.id}`)
    ]);
    res.json({ performance: rows[0] ? perfOut(rows[0], pays) : null });
  }));
  const SETTINGS_KINDS = ["performance_type", "product_category", "group_level", "document_category"];
  const SETTINGS_DEFAULTS = {
    performance_type: ["\u0411\u0430\u0437\u043E\u0432\u044B\u0439 \u0442\u0430\u043D\u0435\u0446", "\u0422\u0430\u043D\u0435\u0446 \u0441 \u0438\u043D\u0442\u0435\u0440\u0430\u043A\u0442\u0438\u0432\u043E\u043C", "\u041D\u0435\u0441\u043A\u043E\u043B\u044C\u043A\u043E \u043D\u043E\u043C\u0435\u0440\u043E\u0432", "\u0418\u043D\u0434\u0438\u0432\u0438\u0434\u0443\u0430\u043B\u044C\u043D\u043E\u0435 \u0432\u044B\u0441\u0442\u0443\u043F\u043B\u0435\u043D\u0438\u0435", "\u0414\u0440\u0443\u0433\u043E\u0435"],
    product_category: ["\u041C\u0435\u0440\u0447", "\u0424\u043E\u0440\u043C\u0430", "\u0410\u043A\u0441\u0435\u0441\u0441\u0443\u0430\u0440\u044B", "\u0421\u0443\u0432\u0435\u043D\u0438\u0440\u044B"],
    group_level: ["\u041F\u0440\u043E\u0434\u043E\u043B\u0436\u0430\u044E\u0449\u0430\u044F \u0433\u0440\u0443\u043F\u043F\u0430", "\u0410\u043D\u0441\u0430\u043C\u0431\u043B\u044C", "\u0418\u043D\u0434\u0438\u0432\u0438\u0434\u0443\u0430\u043B\u044C\u043D\u044B\u0435", "\u041C\u0438\u043D\u0438-\u0433\u0440\u0443\u043F\u043F\u0430", "\u0414\u0440\u0443\u0433\u043E\u0435"],
    document_category: ["\u0410\u0440\u0435\u043D\u0434\u0430", "\u0423\u0441\u043B\u0443\u0433\u0438 \u2014 \u0443\u0431\u043E\u0440\u043A\u0430", "\u0423\u0441\u043B\u0443\u0433\u0438 \u2014 \u0432\u044B\u0432\u043E\u0437 \u043C\u0443\u0441\u043E\u0440\u0430", "\u041F\u043E\u0434\u0440\u044F\u0434\u0447\u0438\u043A\u0438 / \u043F\u043E\u0441\u0442\u0430\u0432\u0449\u0438\u043A\u0438", "\u041F\u0440\u043E\u0447\u0435\u0435"]
  };
  const mockSettings = [];
  app2.get("/api/mvp/settings/lists", ah(async (req, res) => {
    const session = getSession(req);
    const kind = String(req.query.kind || "");
    if (!SETTINGS_KINDS.includes(kind)) return res.status(400).json({ error: "\u041D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u044B\u0439 \u0441\u043F\u0440\u0430\u0432\u043E\u0447\u043D\u0438\u043A" });
    let rows;
    if (!supabaseEnabled) {
      rows = mockSettings.filter((s) => s.kind === kind && s.organizationId === session.organizationId);
    } else {
      rows = await supabaseFetch("settings_lists", `select=*&organization_id=eq.${session.organizationId}&kind=eq.${kind}&is_active=eq.true&order=sort_order.asc,created_at.asc`);
    }
    const items = rows.map((r) => ({ id: r.id, label: r.label, sortOrder: r.sort_order ?? r.sortOrder ?? 0 }));
    const isDefault = items.length === 0;
    const out = isDefault ? SETTINGS_DEFAULTS[kind].map((label, i) => ({ id: `def:${kind}:${i}`, label, sortOrder: i })) : items;
    res.json({ kind, items: out, isDefault });
  }));
  app2.post("/api/mvp/settings/lists", ah(async (req, res) => {
    const session = getSession(req);
    if (session.role !== "owner") return res.status(403).json({ error: "\u0418\u0437\u043C\u0435\u043D\u044F\u0442\u044C \u0441\u043F\u0440\u0430\u0432\u043E\u0447\u043D\u0438\u043A\u0438 \u043C\u043E\u0436\u0435\u0442 \u0442\u043E\u043B\u044C\u043A\u043E \u0432\u043B\u0430\u0434\u0435\u043B\u0435\u0446" });
    const kind = String((req.body || {}).kind || "");
    const label = String((req.body || {}).label || "").trim();
    if (!SETTINGS_KINDS.includes(kind)) return res.status(400).json({ error: "\u041D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u044B\u0439 \u0441\u043F\u0440\u0430\u0432\u043E\u0447\u043D\u0438\u043A" });
    if (!label) return res.status(400).json({ error: "\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u0435" });
    const sortOrder = Number((req.body || {}).sortOrder) || 0;
    if (!supabaseEnabled) {
      const rec = { id: uid(), organizationId: session.organizationId, kind, label, sort_order: sortOrder, is_active: true };
      mockSettings.push(rec);
      return res.status(201).json({ item: { id: rec.id, label, sortOrder } });
    }
    const inserted = await supabaseFetch("settings_lists", "", {
      method: "POST",
      body: JSON.stringify({ organization_id: session.organizationId, kind, label, sort_order: sortOrder })
    });
    res.status(201).json({ item: { id: inserted[0].id, label: inserted[0].label, sortOrder: inserted[0].sort_order } });
  }));
  app2.patch("/api/mvp/settings/lists/:id", ah(async (req, res) => {
    const session = getSession(req);
    if (session.role !== "owner") return res.status(403).json({ error: "\u0414\u043E\u0441\u0442\u0443\u043F\u043D\u043E \u0442\u043E\u043B\u044C\u043A\u043E \u0432\u043B\u0430\u0434\u0435\u043B\u044C\u0446\u0443" });
    const b = req.body || {};
    if (!supabaseEnabled) {
      const rec = mockSettings.find((s) => s.id === req.params.id);
      if (rec) {
        if (b.label !== void 0) rec.label = String(b.label).trim();
        if (b.sortOrder !== void 0) rec.sort_order = Number(b.sortOrder) || 0;
        if (b.isActive !== void 0) rec.is_active = !!b.isActive;
      }
      return res.json({ ok: true });
    }
    const patch = {};
    if (b.label !== void 0) patch.label = String(b.label).trim();
    if (b.sortOrder !== void 0) patch.sort_order = Number(b.sortOrder) || 0;
    if (b.isActive !== void 0) patch.is_active = !!b.isActive;
    await supabaseFetch("settings_lists", `id=eq.${req.params.id}&organization_id=eq.${session.organizationId}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify(patch) });
    res.json({ ok: true });
  }));
  app2.delete("/api/mvp/settings/lists/:id", ah(async (req, res) => {
    const session = getSession(req);
    if (session.role !== "owner") return res.status(403).json({ error: "\u0414\u043E\u0441\u0442\u0443\u043F\u043D\u043E \u0442\u043E\u043B\u044C\u043A\u043E \u0432\u043B\u0430\u0434\u0435\u043B\u044C\u0446\u0443" });
    if (!supabaseEnabled) {
      const i = mockSettings.findIndex((s) => s.id === req.params.id);
      if (i >= 0) mockSettings.splice(i, 1);
      return res.json({ ok: true });
    }
    await supabaseFetch("settings_lists", `id=eq.${req.params.id}&organization_id=eq.${session.organizationId}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
    res.json({ ok: true });
  }));
  const prodOut = (pr) => ({
    id: pr.id,
    name: pr.name,
    category: pr.category ?? pr.category ?? null,
    sku: pr.sku ?? null,
    salePrice: Number(pr.salePrice ?? pr.sale_price) || 0,
    costPrice: Number(pr.costPrice ?? pr.cost_price) || 0,
    minStock: Number(pr.minStock ?? pr.min_stock) || 0,
    comment: pr.comment ?? null,
    description: pr.description ?? null,
    echoPrice: Number(pr.echoPrice ?? pr.echo_price) || 0,
    isActive: (pr.isActive ?? pr.is_active) !== false,
    photoUrl: pr.photoUrl ?? pr.photo_url ?? null,
    branchId: pr.branchId ?? pr.branch_id ?? null
  });
  const mockWriteoffs = [];
  const loadProducts = async (session) => {
    if (!supabaseEnabled) {
      const filt = (arr) => session.role === "owner" ? arr : arr.filter((x) => canSeeBranch(session, x.branchId));
      return {
        products: filt(mockProducts).map(prodOut),
        sales: filt(mockSales).map((s) => ({ id: s.id, productId: s.productId, qty: s.qty, amount: Number(s.amount), method: s.method, soldBy: s.soldBy, date: s.saleDate, branchId: s.branchId })),
        receipts: filt(mockReceipts).map((r) => ({ id: r.id, productId: r.productId, qty: r.qty, costPrice: Number(r.costPrice) || 0, date: r.movementDate, comment: r.comment, branchId: r.branchId })),
        writeoffs: filt(mockWriteoffs).map((w) => ({ id: w.id, productId: w.productId, qty: w.qty, reason: w.reason, date: w.writeoffDate, comment: w.comment, branchId: w.branchId }))
      };
    }
    const orgFilter = `organization_id=eq.${session.organizationId}`;
    const [products, sales, receipts, writeoffs] = await Promise.all([
      supabaseFetch("products", `select=*&${orgFilter}&order=name.asc`),
      supabaseFetch("product_sales", `select=*&${orgFilter}&order=sale_date.desc`),
      supabaseFetch("product_stock_movements", `select=*&${orgFilter}&order=movement_date.desc`),
      supabaseFetch("product_writeoffs", `select=*&${orgFilter}&order=writeoff_date.desc`).catch(() => [])
    ]);
    return {
      products: products.map(prodOut),
      sales: sales.map((s) => ({ id: s.id, productId: s.product_id, qty: s.qty, amount: Number(s.amount), method: s.method, soldBy: s.sold_by, date: s.sale_date, branchId: s.branch_id })),
      receipts: receipts.map((r) => ({ id: r.id, productId: r.product_id, qty: r.qty, costPrice: Number(r.cost_price) || 0, date: r.movement_date, comment: r.comment, branchId: r.branch_id })),
      writeoffs: writeoffs.map((w) => ({ id: w.id, productId: w.product_id, qty: w.qty, reason: w.reason, date: w.writeoff_date, comment: w.comment, branchId: w.branch_id }))
    };
  };
  const stockBalance = (productId, sales, receipts, writeoffs = []) => receipts.filter((r) => r.productId === productId).reduce((s, r) => s + r.qty, 0) - sales.filter((s) => s.productId === productId).reduce((acc, s) => acc + s.qty, 0) - writeoffs.filter((w) => w.productId === productId).reduce((acc, w) => acc + w.qty, 0);
  app2.get("/api/mvp/products", ah(async (req, res) => {
    const session = getSession(req);
    if (session.role === "teacher") return res.status(403).json({ error: "\u0420\u0430\u0437\u0434\u0435\u043B \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D" });
    const { products, sales, receipts, writeoffs } = await loadProducts(session);
    res.json({ products: products.map((pr) => {
      const balance = stockBalance(pr.id, sales, receipts, writeoffs);
      return { ...pr, stock: balance, low: balance <= pr.minStock };
    }) });
  }));
  app2.get("/api/mvp/shop", ah(async (req, res) => {
    const session = getSession(req);
    if (!supabaseEnabled) {
      const items2 = mockProducts.filter((p) => Number(p.salePrice) > 0).map((p) => ({ id: p.id, name: p.name, category: p.category || null, salePrice: Number(p.salePrice) || 0, photoUrl: p.photoUrl || null }));
      return res.json({ products: items2 });
    }
    const rows = await supabaseFetch("products", `select=*&organization_id=eq.${session.organizationId}&order=name.asc`);
    const items = rows.filter((r) => (r.is_active ?? true) && Number(r.sale_price) > 0).map((r) => ({ id: r.id, name: r.name, category: r.category || null, salePrice: Number(r.sale_price) || 0, photoUrl: r.photo_url || null }));
    res.json({ products: items });
  }));
  const ORDER_STATUSES = ["new", "confirmed", "ready", "done", "cancelled"];
  const mockOrders = [];
  app2.post("/api/mvp/shop/orders", ah(async (req, res) => {
    const session = getSession(req);
    const b = req.body || {};
    const rawItems = Array.isArray(b.items) ? b.items : [];
    if (rawItems.length === 0) return res.status(400).json({ error: "\u041A\u043E\u0440\u0437\u0438\u043D\u0430 \u043F\u0443\u0441\u0442\u0430" });
    let priceOf;
    if (!supabaseEnabled) {
      priceOf = (id) => {
        const p = mockProducts.find((x) => x.id === id);
        return p ? { name: p.name, price: Number(p.salePrice) || 0, branchId: p.branchId } : null;
      };
    } else {
      const ids = rawItems.map((i) => i.productId).filter(Boolean);
      const rows = ids.length ? await supabaseFetch("products", `select=id,name,sale_price,branch_id&organization_id=eq.${session.organizationId}&id=in.(${ids.join(",")})`) : [];
      priceOf = (id) => {
        const p = rows.find((x) => x.id === id);
        return p ? { name: p.name, price: Number(p.sale_price) || 0, branchId: p.branch_id } : null;
      };
    }
    const items = rawItems.map((i) => {
      const meta = priceOf(i.productId);
      const qty = Math.max(1, parseInt(i.qty, 10) || 1);
      const price = meta?.price || 0;
      return { productId: i.productId, productName: meta?.name || i.productName || "\u0422\u043E\u0432\u0430\u0440", qty, price, amount: qty * price, branchId: meta?.branchId || null };
    }).filter((i) => i.productName);
    const total = items.reduce((s, i) => s + i.amount, 0);
    const branchId = b.branchId || items[0]?.branchId || session.dbBranchId || null;
    if (!supabaseEnabled) {
      const order = { id: uid(), createdAt: (/* @__PURE__ */ new Date()).toISOString(), status: "new", customerName: b.customerName || "", customerPhone: b.customerPhone || "", comment: b.comment || null, total, branchId, items };
      mockOrders.unshift(order);
      return res.status(201).json({ order });
    }
    const inserted = await supabaseFetch("product_orders", "", {
      method: "POST",
      body: JSON.stringify({ organization_id: session.organizationId, branch_id: branchId, student_id: b.studentId || null, customer_name: b.customerName || null, customer_phone: b.customerPhone || null, status: "new", total, comment: b.comment || null })
    });
    const orderId = inserted[0].id;
    await supabaseFetch("product_order_items", "", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify(items.map((i) => ({ order_id: orderId, product_id: i.productId || null, product_name: i.productName, qty: i.qty, price: i.price, amount: i.amount })))
    });
    res.status(201).json({ order: { id: orderId, status: "new", total, items } });
  }));
  app2.get("/api/mvp/shop/orders", ah(async (req, res) => {
    const session = getSession(req);
    if (!["owner", "branch_manager", "admin"].includes(session.role)) return res.status(403).json({ error: "\u0414\u043E\u0441\u0442\u0443\u043F\u043D\u043E \u0432\u043B\u0430\u0434\u0435\u043B\u044C\u0446\u0443, \u0443\u043F\u0440\u0430\u0432\u043B\u044F\u044E\u0449\u0435\u043C\u0443 \u0438 \u0430\u0434\u043C\u0438\u043D\u0438\u0441\u0442\u0440\u0430\u0442\u043E\u0440\u0443" });
    if (!supabaseEnabled) {
      const list = session.role === "owner" ? mockOrders : mockOrders.filter((o) => canSeeBranch(session, o.branchId));
      return res.json({ orders: list });
    }
    const orders = await supabaseFetch("product_orders", `select=*&organization_id=eq.${session.organizationId}&order=created_at.desc`);
    const scoped = orders.filter((o) => canSeeBranch(session, o.branch_id));
    const ids = scoped.map((o) => o.id);
    const allItems = ids.length ? await supabaseFetch("product_order_items", `select=*&order_id=in.(${ids.join(",")})`) : [];
    res.json({ orders: scoped.map((o) => ({
      id: o.id,
      createdAt: o.created_at,
      status: o.status,
      customerName: o.customer_name || "",
      customerPhone: o.customer_phone || "",
      comment: o.comment || null,
      total: Number(o.total) || 0,
      branchId: o.branch_id,
      items: allItems.filter((it) => it.order_id === o.id).map((it) => ({ productName: it.product_name, qty: it.qty, price: Number(it.price) || 0, amount: Number(it.amount) || 0 }))
    })) });
  }));
  app2.patch("/api/mvp/shop/orders/:id", ah(async (req, res) => {
    const session = getSession(req);
    if (!["owner", "branch_manager", "admin"].includes(session.role)) return res.status(403).json({ error: "\u041D\u0435\u0434\u043E\u0441\u0442\u0430\u0442\u043E\u0447\u043D\u043E \u043F\u0440\u0430\u0432" });
    const status = String((req.body || {}).status || "");
    if (!ORDER_STATUSES.includes(status)) return res.status(400).json({ error: "\u041D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u044B\u0439 \u0441\u0442\u0430\u0442\u0443\u0441" });
    if (!supabaseEnabled) {
      const o = mockOrders.find((x) => x.id === req.params.id);
      if (o) {
        if (status === "done" && !o.fulfilledAt) {
          o.fulfilledAt = (/* @__PURE__ */ new Date()).toISOString();
          for (const it of o.items || []) {
            if (!it.productId) continue;
            mockSales.unshift({ id: uid(), productId: it.productId, qty: it.qty, amount: it.amount, method: "transfer", soldBy: "\u041C\u0430\u0433\u0430\u0437\u0438\u043D (\u0437\u0430\u043A\u0430\u0437)", saleDate: todayStr(), branchId: o.branchId || null });
          }
        }
        o.status = status;
      }
      return res.json({ ok: true, status });
    }
    const cur = await supabaseFetch("product_orders", `select=id,status,fulfilled_at,branch_id&id=eq.${req.params.id}&organization_id=eq.${session.organizationId}`);
    if (!cur[0]) return res.status(404).json({ error: "\u0417\u0430\u043A\u0430\u0437 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D" });
    const patch = { status, updated_at: (/* @__PURE__ */ new Date()).toISOString() };
    let fulfilled = false;
    if (status === "done" && !cur[0].fulfilled_at) {
      patch.fulfilled_at = (/* @__PURE__ */ new Date()).toISOString();
      const items = await supabaseFetch("product_order_items", `select=*&order_id=eq.${req.params.id}`);
      const sales = items.filter((it) => it.product_id).map((it) => ({
        organization_id: session.organizationId,
        branch_id: cur[0].branch_id || null,
        product_id: it.product_id,
        qty: it.qty,
        amount: Number(it.amount) || 0,
        method: "transfer",
        sold_by: "\u041C\u0430\u0433\u0430\u0437\u0438\u043D (\u0437\u0430\u043A\u0430\u0437)",
        sale_date: todayStr(),
        comment: "\u0412\u044B\u0434\u0430\u0447\u0430 \u0437\u0430\u043A\u0430\u0437\u0430 \u0438\u0437 \u043C\u0430\u0433\u0430\u0437\u0438\u043D\u0430"
      }));
      if (sales.length) await supabaseFetch("product_sales", "", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify(sales) });
      fulfilled = true;
    }
    await supabaseFetch("product_orders", `id=eq.${req.params.id}&organization_id=eq.${session.organizationId}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify(patch) });
    res.json({ ok: true, status, fulfilled });
  }));
  const mockStudentAccess = {};
  const ageFromBirthday = (b) => {
    if (!b) return null;
    const d = new Date(b);
    if (isNaN(d.getTime())) return null;
    const t = /* @__PURE__ */ new Date();
    let a = t.getFullYear() - d.getFullYear();
    const m = t.getMonth() - d.getMonth();
    if (m < 0 || m === 0 && t.getDate() < d.getDate()) a--;
    return a;
  };
  const loadStudentAccess = async (session, studentId) => {
    if (!supabaseEnabled) {
      const s = initialStudents.find((x) => x.id === studentId);
      if (!s) return null;
      const rec = mockStudentAccess[studentId];
      return {
        id: s.id,
        name: s.name,
        age: s.age ?? ageFromBirthday(s.birthday),
        branchId: s.branchId ?? null,
        levelManual: rec?.level ?? null,
        token: rec?.token ?? null,
        code: rec?.code ?? null,
        enabled: !!rec?.enabled
      };
    }
    const rows = await supabaseFetch("students", `select=id,first_name,last_name,birthday,branch_id,access_level,access_token,access_code,access_enabled&id=eq.${studentId}&organization_id=eq.${session.organizationId}&limit=1`);
    const r = rows[0];
    if (!r) return null;
    return {
      id: r.id,
      name: [r.first_name, r.last_name].filter(Boolean).join(" ") || r.full_name || "\u0423\u0447\u0435\u043D\u0438\u043A",
      age: ageFromBirthday(r.birthday),
      branchId: r.branch_id ?? null,
      levelManual: r.access_level === "junior" || r.access_level === "senior" ? r.access_level : null,
      token: r.access_token ?? null,
      code: r.access_code ?? null,
      enabled: !!r.access_enabled
    };
  };
  const accessStatusOut = (st) => {
    const level = effectiveAccessLevel(st.levelManual, st.age);
    return {
      enabled: st.enabled,
      level,
      levelManual: st.levelManual,
      autoLevel: effectiveAccessLevel(null, st.age),
      token: st.enabled ? st.token : null,
      code: st.enabled ? st.code : null,
      tabs: tabsForLevel(level)
    };
  };
  app2.get("/api/mvp/students/:id/access", ah(async (req, res) => {
    const session = getSession(req);
    if (!accessGrantStaff.includes(session.role)) return res.status(403).json({ error: "\u041D\u0435\u0434\u043E\u0441\u0442\u0430\u0442\u043E\u0447\u043D\u043E \u043F\u0440\u0430\u0432" });
    const st = await loadStudentAccess(session, String(req.params.id));
    if (!st) return res.status(404).json({ error: "\u0423\u0447\u0435\u043D\u0438\u043A \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D" });
    if (!canSeeBranch(session, st.branchId)) return res.status(403).json({ error: "\u0423\u0447\u0435\u043D\u0438\u043A \u0434\u0440\u0443\u0433\u043E\u0433\u043E \u0444\u0438\u043B\u0438\u0430\u043B\u0430" });
    res.json(accessStatusOut(st));
  }));
  app2.post("/api/mvp/students/:id/access", ah(async (req, res) => {
    const session = getSession(req);
    if (!accessGrantStaff.includes(session.role)) return res.status(403).json({ error: "\u041D\u0435\u0434\u043E\u0441\u0442\u0430\u0442\u043E\u0447\u043D\u043E \u043F\u0440\u0430\u0432" });
    const st = await loadStudentAccess(session, String(req.params.id));
    if (!st) return res.status(404).json({ error: "\u0423\u0447\u0435\u043D\u0438\u043A \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D" });
    if (!canSeeBranch(session, st.branchId)) return res.status(403).json({ error: "\u0423\u0447\u0435\u043D\u0438\u043A \u0434\u0440\u0443\u0433\u043E\u0433\u043E \u0444\u0438\u043B\u0438\u0430\u043B\u0430" });
    const rawLevel = String((req.body || {}).level || "auto");
    const manual = rawLevel === "junior" || rawLevel === "senior" ? rawLevel : null;
    const token = st.token || newAccessToken();
    const uniqueAccessCode = async () => {
      for (let i = 0; i < 6; i++) {
        const c = newAccessCode();
        if (!supabaseEnabled) {
          if (!Object.values(mockStudentAccess).some((v) => v.code === c)) return c;
        } else {
          const ex = await supabaseFetch("students", `select=id&access_code=eq.${c}&limit=1`).catch(() => []);
          if (!ex[0]) return c;
        }
      }
      return newAccessCode();
    };
    const code = st.code || await uniqueAccessCode();
    const level = effectiveAccessLevel(manual, st.age);
    const nowIso = (/* @__PURE__ */ new Date()).toISOString();
    if (supabaseEnabled) {
      await supabaseFetch("students", `id=eq.${st.id}&organization_id=eq.${session.organizationId}`, {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ access_token: token, access_code: code, access_level: manual, access_enabled: true, access_granted_by: session.fullName || null, access_granted_at: nowIso })
      });
    } else {
      mockStudentAccess[st.id] = { token, code, level: manual, enabled: true, by: session.fullName || null, at: nowIso };
    }
    studentAccessTokens.set(token, { studentId: st.id, level, branchId: st.branchId });
    res.json({ ...accessStatusOut({ levelManual: manual, age: st.age, token, code, enabled: true }), grantedBy: session.fullName || null, grantedAt: nowIso });
  }));
  app2.delete("/api/mvp/students/:id/access", ah(async (req, res) => {
    const session = getSession(req);
    if (!accessGrantStaff.includes(session.role)) return res.status(403).json({ error: "\u041D\u0435\u0434\u043E\u0441\u0442\u0430\u0442\u043E\u0447\u043D\u043E \u043F\u0440\u0430\u0432" });
    const st = await loadStudentAccess(session, String(req.params.id));
    if (!st) return res.status(404).json({ error: "\u0423\u0447\u0435\u043D\u0438\u043A \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D" });
    if (!canSeeBranch(session, st.branchId)) return res.status(403).json({ error: "\u0423\u0447\u0435\u043D\u0438\u043A \u0434\u0440\u0443\u0433\u043E\u0433\u043E \u0444\u0438\u043B\u0438\u0430\u043B\u0430" });
    if (st.token) studentAccessTokens.delete(st.token);
    if (supabaseEnabled) {
      await supabaseFetch("students", `id=eq.${st.id}&organization_id=eq.${session.organizationId}`, {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ access_enabled: false, access_token: null, access_code: null })
      });
    } else if (mockStudentAccess[st.id]) {
      mockStudentAccess[st.id].enabled = false;
      mockStudentAccess[st.id].token = "";
      mockStudentAccess[st.id].code = "";
    }
    res.json({ ok: true });
  }));
  app2.post("/api/mvp/student-auth", ah(async (req, res) => {
    const body = req.body || {};
    const token = String(body.token || "").trim();
    const code = normalizeAccessCode(body.code || "");
    const phoneDigits = String(body.phone || "").replace(/\D/g, "").slice(-10);
    const password = String(body.password || "");
    const badCred = () => res.status(401).json({ error: "\u041A\u043E\u0434 \u043D\u0435\u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0442\u0435\u043B\u0435\u043D \u0438\u043B\u0438 \u0434\u043E\u0441\u0442\u0443\u043F \u043E\u0442\u043E\u0437\u0432\u0430\u043D" });
    if (phoneDigits) {
      if (phoneDigits.length < 10) return res.status(400).json({ error: "\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u043D\u043E\u043C\u0435\u0440 \u0442\u0435\u043B\u0435\u0444\u043E\u043D\u0430 \u043F\u043E\u043B\u043D\u043E\u0441\u0442\u044C\u044E" });
      if (password !== STUDENT_STANDARD_PASSWORD) return res.status(401).json({ error: "\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0439 \u043F\u0430\u0440\u043E\u043B\u044C" });
      const last10 = (v) => String(v || "").replace(/\D/g, "").slice(-10);
      if (!supabaseEnabled) {
        const s = initialStudents.find((x) => last10(x.phone) === phoneDigits || last10(x.parentPhone) === phoneDigits);
        if (!s) return res.status(404).json({ error: "\u0423\u0447\u0435\u043D\u0438\u043A \u0441 \u0442\u0430\u043A\u0438\u043C \u043D\u043E\u043C\u0435\u0440\u043E\u043C \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D" });
        const level3 = effectiveAccessLevel(mockStudentAccess[s.id]?.level ?? null, s.age ?? ageFromBirthday(s.birthday));
        return res.json({ studentId: s.id, name: s.name, level: level3, token: null, tabs: tabsForLevel(level3) });
      }
      const tail7 = phoneDigits.slice(-7);
      const rows2 = await supabaseFetch("students", `select=id,first_name,last_name,full_name,birthday,branch_id,access_level,phone,parent_phone&or=(phone.like.*${tail7}*,parent_phone.like.*${tail7}*)&limit=20`).catch(() => []);
      const r2 = rows2.find((x) => last10(x.phone) === phoneDigits || last10(x.parent_phone) === phoneDigits);
      if (!r2) return res.status(404).json({ error: "\u0423\u0447\u0435\u043D\u0438\u043A \u0441 \u0442\u0430\u043A\u0438\u043C \u043D\u043E\u043C\u0435\u0440\u043E\u043C \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D" });
      const name2 = [r2.first_name, r2.last_name].filter(Boolean).join(" ") || r2.full_name || "\u0423\u0447\u0435\u043D\u0438\u043A";
      const level2 = effectiveAccessLevel(r2.access_level, ageFromBirthday(r2.birthday));
      return res.json({ studentId: r2.id, name: name2, level: level2, token: null, tabs: tabsForLevel(level2) });
    }
    if (!token && !code) return res.status(400).json({ error: "\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u043D\u043E\u043C\u0435\u0440 \u0442\u0435\u043B\u0435\u0444\u043E\u043D\u0430 \u0438 \u043F\u0430\u0440\u043E\u043B\u044C" });
    if (!supabaseEnabled) {
      const entry = Object.entries(mockStudentAccess).find(([, v]) => v.enabled && (token && v.token === token || code && v.code === code));
      const cached = !entry && token ? studentAccessTokens.get(token) : void 0;
      const studentId = entry?.[0] || cached?.studentId;
      if (!studentId) return badCred();
      const s = initialStudents.find((x) => x.id === studentId);
      if (!s) return res.status(404).json({ error: "\u0423\u0447\u0435\u043D\u0438\u043A \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D" });
      const rec = mockStudentAccess[studentId];
      const level2 = effectiveAccessLevel(rec?.level ?? null, s.age ?? ageFromBirthday(s.birthday));
      const outToken2 = rec?.token || token || "";
      if (outToken2) studentAccessTokens.set(outToken2, { studentId, level: level2, branchId: s.branchId ?? null });
      return res.json({ studentId, name: s.name, level: level2, token: outToken2 || null, tabs: tabsForLevel(level2) });
    }
    const filter = token ? `access_token=eq.${token}` : `access_code=eq.${code}`;
    const rows = await supabaseFetch("students", `select=id,first_name,last_name,birthday,branch_id,access_level,access_token,access_enabled&${filter}&access_enabled=is.true&limit=1`);
    const r = rows[0];
    if (!r) return badCred();
    const name = [r.first_name, r.last_name].filter(Boolean).join(" ") || r.full_name || "\u0423\u0447\u0435\u043D\u0438\u043A";
    const level = effectiveAccessLevel(r.access_level, ageFromBirthday(r.birthday));
    const outToken = r.access_token || token || "";
    if (outToken) studentAccessTokens.set(outToken, { studentId: r.id, level, branchId: r.branch_id ?? null });
    res.json({ studentId: r.id, name, level, token: outToken || null, tabs: tabsForLevel(level) });
  }));
  const echoStaff = ["owner", "branch_manager", "admin", "teacher"];
  const mockEchoBalances = {};
  const mockEchoTx = [];
  const echoTxOut = (t) => ({
    id: t.id,
    studentId: t.studentId ?? t.student_id,
    amount: Number(t.amount) || 0,
    kind: t.kind || "grant",
    reason: t.reason ?? null,
    productId: t.productId ?? t.product_id ?? null,
    balanceAfter: Number(t.balanceAfter ?? t.balance_after) || 0,
    createdBy: t.createdBy ?? t.created_by ?? null,
    createdAt: t.createdAt ?? t.created_at
  });
  const applyEcho = async (session, studentId, amount, kind, reason, productId) => {
    if (!supabaseEnabled) {
      const cur2 = mockEchoBalances[studentId] ?? 0;
      const next2 = cur2 + amount;
      if (next2 < 0) throw new Error("INSUFFICIENT");
      mockEchoBalances[studentId] = next2;
      const tx = { id: uid(), studentId, amount, kind, reason, productId, balanceAfter: next2, createdBy: session.fullName || null, createdAt: (/* @__PURE__ */ new Date()).toISOString() };
      mockEchoTx.unshift(tx);
      return { balance: next2, tx: echoTxOut(tx) };
    }
    const st = await supabaseFetch("students", `select=id,echo_balance&id=eq.${studentId}&organization_id=eq.${session.organizationId}&limit=1`);
    if (!st[0]) throw new Error("NOT_FOUND");
    const cur = Number(st[0].echo_balance) || 0;
    const next = cur + amount;
    if (next < 0) throw new Error("INSUFFICIENT");
    await supabaseFetch("students", `id=eq.${studentId}&organization_id=eq.${session.organizationId}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ echo_balance: next }) });
    const ins = await supabaseFetch("echo_transactions", "", { method: "POST", body: JSON.stringify({ organization_id: session.organizationId, student_id: studentId, amount, kind, reason, product_id: productId, balance_after: next, created_by: session.fullName || null }) });
    return { balance: next, tx: ins[0] ? echoTxOut(ins[0]) : null };
  };
  app2.get("/api/mvp/shop/echo/catalog", ah(async (req, res) => {
    const session = getSession(req);
    if (!supabaseEnabled) {
      const items2 = mockProducts.filter((p) => p.isActive !== false && Number(p.echoPrice) > 0).map((p) => ({ id: p.id, name: p.name, category: p.category || null, echoPrice: Number(p.echoPrice) || 0, description: p.description || null, photoUrl: p.photoUrl || null })).sort((a, b) => a.echoPrice - b.echoPrice);
      return res.json({ products: items2 });
    }
    const rows = await supabaseFetch("products", `select=*&organization_id=eq.${session.organizationId}`);
    const items = rows.filter((r) => (r.is_active ?? true) && Number(r.echo_price) > 0).map((r) => ({ id: r.id, name: r.name, category: r.category || null, echoPrice: Number(r.echo_price) || 0, description: r.description || null, photoUrl: r.photo_url || null })).sort((a, b) => a.echoPrice - b.echoPrice);
    res.json({ products: items });
  }));
  app2.get("/api/mvp/shop/echo/wallet", ah(async (req, res) => {
    const session = getSession(req);
    const studentId = String(req.query.studentId || "");
    if (!studentId) return res.status(400).json({ error: "\u041D\u0435 \u0443\u043A\u0430\u0437\u0430\u043D \u0443\u0447\u0435\u043D\u0438\u043A" });
    if (session.role === "student" && session.studentId !== studentId) {
      return res.status(403).json({ error: "\u041D\u0435\u0442 \u0434\u043E\u0441\u0442\u0443\u043F\u0430 \u043A \u0447\u0443\u0436\u043E\u043C\u0443 \u043A\u043E\u0448\u0435\u043B\u044C\u043A\u0443" });
    }
    if (!supabaseEnabled) {
      return res.json({ balance: mockEchoBalances[studentId] ?? 0, transactions: mockEchoTx.filter((t) => t.studentId === studentId).slice(0, 50).map(echoTxOut) });
    }
    const st = await supabaseFetch("students", `select=id,echo_balance&id=eq.${studentId}&organization_id=eq.${session.organizationId}&limit=1`);
    const balance = st[0] ? Number(st[0].echo_balance) || 0 : 0;
    const tx = await supabaseFetch("echo_transactions", `select=*&student_id=eq.${studentId}&order=created_at.desc&limit=50`).catch(() => []);
    res.json({ balance, transactions: tx.map(echoTxOut) });
  }));
  app2.get("/api/mvp/shop/echo/students", ah(async (req, res) => {
    const session = getSession(req);
    if (!echoStaff.includes(session.role)) return res.status(403).json({ error: "\u041D\u0435\u0434\u043E\u0441\u0442\u0430\u0442\u043E\u0447\u043D\u043E \u043F\u0440\u0430\u0432" });
    if (!supabaseEnabled) {
      const list = initialStudents.filter((s) => session.role === "owner" || canSeeBranch(session, s.branchId)).map((s) => ({ id: s.id, name: s.name, balance: mockEchoBalances[s.id] ?? 0 }));
      return res.json({ students: list });
    }
    const rows = await supabaseFetch("students", `select=id,first_name,last_name,echo_balance,branch_id&organization_id=eq.${session.organizationId}&status=neq.archived&order=first_name.asc`);
    const scoped = rows.filter((r) => canSeeBranch(session, r.branch_id));
    res.json({ students: scoped.map((r) => ({ id: r.id, name: [r.first_name, r.last_name].filter(Boolean).join(" ") || r.full_name || "\u0423\u0447\u0435\u043D\u0438\u043A", balance: Number(r.echo_balance) || 0 })) });
  }));
  app2.post("/api/mvp/shop/echo/grant", ah(async (req, res) => {
    const session = getSession(req);
    if (!echoStaff.includes(session.role)) return res.status(403).json({ error: "\u041D\u0435\u0434\u043E\u0441\u0442\u0430\u0442\u043E\u0447\u043D\u043E \u043F\u0440\u0430\u0432" });
    const b = req.body || {};
    const studentId = String(b.studentId || "");
    const amount = Math.trunc(Number(b.amount) || 0);
    if (!studentId) return res.status(400).json({ error: "\u041D\u0435 \u0443\u043A\u0430\u0437\u0430\u043D \u0443\u0447\u0435\u043D\u0438\u043A" });
    if (!amount) return res.status(400).json({ error: "\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u043A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u043E \u042D\u0445\u043E\u0411\u0430\u043A\u0441\u043E\u0432 (\u0441\u043E \u0437\u043D\u0430\u043A\u043E\u043C \u043C\u0438\u043D\u0443\u0441 \u2014 \u0441\u043F\u0438\u0441\u0430\u043D\u0438\u0435)" });
    try {
      const { balance, tx } = await applyEcho(session, studentId, amount, "grant", (b.reason || "").toString().trim() || null, null);
      res.json({ balance, transaction: tx });
    } catch (e) {
      if (e?.message === "INSUFFICIENT") return res.status(400).json({ error: "\u041D\u0435\u0434\u043E\u0441\u0442\u0430\u0442\u043E\u0447\u043D\u043E \u0431\u0430\u043B\u0430\u043D\u0441\u0430 \u0434\u043B\u044F \u0441\u043F\u0438\u0441\u0430\u043D\u0438\u044F" });
      if (e?.message === "NOT_FOUND") return res.status(404).json({ error: "\u0423\u0447\u0435\u043D\u0438\u043A \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D" });
      throw e;
    }
  }));
  app2.post("/api/mvp/shop/echo/purchase", ah(async (req, res) => {
    const session = getSession(req);
    const b = req.body || {};
    const studentId = String(b.studentId || "");
    const productId = String(b.productId || "");
    if (!studentId || !productId) return res.status(400).json({ error: "\u041D\u0435 \u0443\u043A\u0430\u0437\u0430\u043D \u0443\u0447\u0435\u043D\u0438\u043A \u0438\u043B\u0438 \u0442\u043E\u0432\u0430\u0440" });
    if (session.role === "student" && session.studentId !== studentId) {
      return res.status(403).json({ error: "\u041D\u0435\u043B\u044C\u0437\u044F \u043F\u043E\u043A\u0443\u043F\u0430\u0442\u044C \u0437\u0430 \u0447\u0443\u0436\u043E\u0439 \u0441\u0447\u0451\u0442" });
    }
    let prod = null;
    if (!supabaseEnabled) {
      const p = mockProducts.find((x) => x.id === productId);
      if (p) prod = { name: p.name, echoPrice: Number(p.echoPrice) || 0, active: p.isActive !== false };
    } else {
      const rows = await supabaseFetch("products", `select=name,echo_price,is_active&id=eq.${productId}&organization_id=eq.${session.organizationId}&limit=1`);
      if (rows[0]) prod = { name: rows[0].name, echoPrice: Number(rows[0].echo_price) || 0, active: rows[0].is_active ?? true };
    }
    if (!prod) return res.status(404).json({ error: "\u0422\u043E\u0432\u0430\u0440 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D" });
    if (!prod.active || prod.echoPrice <= 0) return res.status(400).json({ error: "\u0422\u043E\u0432\u0430\u0440 \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D \u0434\u043B\u044F \u043F\u043E\u043A\u0443\u043F\u043A\u0438 \u0437\u0430 \u042D\u0445\u043E\u0411\u0430\u043A\u0441\u044B" });
    try {
      const { balance, tx } = await applyEcho(session, studentId, -prod.echoPrice, "purchase", `\u041F\u043E\u043A\u0443\u043F\u043A\u0430: ${prod.name}`, productId);
      res.json({ balance, transaction: tx, productName: prod.name });
    } catch (e) {
      if (e?.message === "INSUFFICIENT") return res.status(400).json({ error: "\u041D\u0435\u0434\u043E\u0441\u0442\u0430\u0442\u043E\u0447\u043D\u043E \u042D\u0445\u043E\u0411\u0430\u043A\u0441\u043E\u0432 \u0434\u043B\u044F \u043F\u043E\u043A\u0443\u043F\u043A\u0438" });
      if (e?.message === "NOT_FOUND") return res.status(404).json({ error: "\u0423\u0447\u0435\u043D\u0438\u043A \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D" });
      throw e;
    }
  }));
  const echoOrderStaff = ["owner", "branch_manager", "admin"];
  const mockEchoOrders = [];
  const echoOrderOut = (o) => ({
    id: o.id,
    studentId: o.studentId ?? o.student_id,
    productId: o.productId ?? o.product_id ?? null,
    branchId: o.branchId ?? o.branch_id ?? null,
    studentName: o.studentName ?? o.student_name ?? null,
    branchName: o.branchName ?? o.branch_name ?? null,
    groupName: o.groupName ?? o.group_name ?? null,
    teacherName: o.teacherName ?? o.teacher_name ?? null,
    productName: o.productName ?? o.product_name ?? null,
    productPhoto: o.productPhoto ?? o.product_photo ?? null,
    echoPrice: Number(o.echoPrice ?? o.echo_price) || 0,
    balance: Number(o.balanceAtRequest ?? o.balance_at_request) || 0,
    status: o.status || "pending",
    cancelReason: o.cancelReason ?? o.cancel_reason ?? null,
    decidedBy: o.decidedBy ?? o.decided_by ?? null,
    createdAt: o.createdAt ?? o.created_at,
    decidedAt: o.decidedAt ?? o.decided_at ?? null
  });
  const resolveEchoCard = async (session, studentId) => {
    if (!supabaseEnabled) {
      const s2 = initialStudents.find((x) => x.id === studentId);
      if (!s2) return null;
      const g2 = initialGroups.find((x) => x.id === s2.groupId);
      const t = initialTeachers.find((x) => x.id === (g2?.teacherId ?? s2.teacherId));
      const b = initialBranches.find((x) => x.id === s2.branchId);
      return { name: s2.name || "\u0423\u0447\u0435\u043D\u0438\u043A", branchId: s2.branchId ?? null, branchName: b?.name ?? null, groupName: g2?.name ?? null, teacherName: t?.name ?? null, balance: mockEchoBalances[studentId] ?? 0 };
    }
    const st = await supabaseFetch("students", `select=*&id=eq.${studentId}&organization_id=eq.${session.organizationId}&limit=1`).catch(() => []);
    if (!st[0]) return null;
    const s = st[0];
    const name = [s.first_name, s.last_name].filter(Boolean).join(" ") || s.full_name || "\u0423\u0447\u0435\u043D\u0438\u043A";
    let branchName = null, groupName = null, teacherName = null;
    if (s.branch_id) {
      const b = await supabaseFetch("branches", `select=name&id=eq.${s.branch_id}&limit=1`).catch(() => []);
      branchName = b[0]?.name ?? null;
    }
    if (s.group_id) {
      const g2 = await supabaseFetch("groups", `select=name,teacher_id&id=eq.${s.group_id}&limit=1`).catch(() => []);
      groupName = g2[0]?.name ?? null;
      const tid = g2[0]?.teacher_id ?? s.teacher_id;
      if (tid) {
        const t = await supabaseFetch("teachers", `select=name,first_name,last_name&id=eq.${tid}&limit=1`).catch(() => []);
        teacherName = t[0]?.name ?? [t[0]?.first_name, t[0]?.last_name].filter(Boolean).join(" ") ?? null;
      }
    }
    return { name, branchId: s.branch_id ?? null, branchName, groupName, teacherName, balance: Number(s.echo_balance) || 0 };
  };
  const productStock = async (session, productId) => {
    const { sales, receipts, writeoffs } = await loadProducts(session);
    return stockBalance(productId, sales, receipts, writeoffs);
  };
  app2.post("/api/mvp/shop/echo/orders", ah(async (req, res) => {
    const session = getSession(req);
    if (session.role === "student" && session.accessLevel === "junior") {
      return res.status(403).json({ error: "\u041E\u0431\u043C\u0435\u043D \u042D\u0445\u043E\u0411\u0430\u043A\u0441\u043E\u0432 \u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D \u0442\u043E\u043B\u044C\u043A\u043E \u0432\u0437\u0440\u043E\u0441\u043B\u043E\u0439 \u0433\u0440\u0443\u043F\u043F\u0435" });
    }
    const b = req.body || {};
    const studentId = String(b.studentId || session.studentId || "");
    const productId = String(b.productId || "");
    if (!studentId || !productId) return res.status(400).json({ error: "\u041D\u0435 \u0443\u043A\u0430\u0437\u0430\u043D \u0443\u0447\u0435\u043D\u0438\u043A \u0438\u043B\u0438 \u0442\u043E\u0432\u0430\u0440" });
    if (session.role === "student" && session.studentId && session.studentId !== studentId) {
      return res.status(403).json({ error: "\u041D\u0435\u043B\u044C\u0437\u044F \u043E\u0444\u043E\u0440\u043C\u043B\u044F\u0442\u044C \u0437\u0430\u044F\u0432\u043A\u0443 \u0437\u0430 \u0434\u0440\u0443\u0433\u043E\u0433\u043E \u0443\u0447\u0435\u043D\u0438\u043A\u0430" });
    }
    let prod = null;
    if (!supabaseEnabled) {
      const p = mockProducts.find((x) => x.id === productId);
      if (p) prod = { name: p.name, echoPrice: Number(p.echoPrice) || 0, active: p.isActive !== false, photo: p.photoUrl || null };
    } else {
      const rows = await supabaseFetch("products", `select=name,echo_price,is_active,photo_url&id=eq.${productId}&organization_id=eq.${session.organizationId}&limit=1`);
      if (rows[0]) prod = { name: rows[0].name, echoPrice: Number(rows[0].echo_price) || 0, active: rows[0].is_active ?? true, photo: rows[0].photo_url || null };
    }
    if (!prod) return res.status(404).json({ error: "\u0422\u043E\u0432\u0430\u0440 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D" });
    if (!prod.active || prod.echoPrice <= 0) return res.status(400).json({ error: "\u0422\u043E\u0432\u0430\u0440 \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D \u0434\u043B\u044F \u043E\u0431\u043C\u0435\u043D\u0430 \u043D\u0430 \u042D\u0445\u043E\u0411\u0430\u043A\u0441\u044B" });
    if (await productStock(session, productId) <= 0) return res.status(400).json({ error: "\u0422\u043E\u0432\u0430\u0440\u0430 \u043D\u0435\u0442 \u0432 \u043D\u0430\u043B\u0438\u0447\u0438\u0438 \u2014 \u043E\u0431\u043C\u0435\u043D \u0432\u0440\u0435\u043C\u0435\u043D\u043D\u043E \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D" });
    const card = await resolveEchoCard(session, studentId);
    if (!card) return res.status(404).json({ error: "\u0423\u0447\u0435\u043D\u0438\u043A \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D" });
    if (card.balance < prod.echoPrice) return res.status(400).json({ error: "\u041D\u0435\u0434\u043E\u0441\u0442\u0430\u0442\u043E\u0447\u043D\u043E \u042D\u0445\u043E\u0411\u0430\u043A\u0441\u043E\u0432 \u0434\u043B\u044F \u043E\u0431\u043C\u0435\u043D\u0430" });
    const dupPending = (list) => list.some((o) => (o.studentId ?? o.student_id) === studentId && (o.productId ?? o.product_id) === productId && o.status === "pending");
    if (!supabaseEnabled) {
      if (dupPending(mockEchoOrders)) return res.status(400).json({ error: "\u0417\u0430\u044F\u0432\u043A\u0430 \u043D\u0430 \u044D\u0442\u043E\u0442 \u0442\u043E\u0432\u0430\u0440 \u0443\u0436\u0435 \u0441\u043E\u0437\u0434\u0430\u043D\u0430 \u0438 \u043E\u0436\u0438\u0434\u0430\u0435\u0442 \u0432\u044B\u0434\u0430\u0447\u0438" });
      const order = { id: uid(), studentId, productId, branchId: card.branchId, studentName: card.name, branchName: card.branchName, groupName: card.groupName, teacherName: card.teacherName, productName: prod.name, productPhoto: prod.photo, echoPrice: prod.echoPrice, balanceAtRequest: card.balance, status: "pending", cancelReason: null, decidedBy: null, createdAt: (/* @__PURE__ */ new Date()).toISOString(), decidedAt: null };
      mockEchoOrders.unshift(order);
      return res.status(201).json({ order: echoOrderOut(order) });
    }
    const exist = await supabaseFetch("echo_orders", `select=id&student_id=eq.${studentId}&product_id=eq.${productId}&status=eq.pending&limit=1`).catch(() => []);
    if (dupPending(exist)) return res.status(400).json({ error: "\u0417\u0430\u044F\u0432\u043A\u0430 \u043D\u0430 \u044D\u0442\u043E\u0442 \u0442\u043E\u0432\u0430\u0440 \u0443\u0436\u0435 \u0441\u043E\u0437\u0434\u0430\u043D\u0430 \u0438 \u043E\u0436\u0438\u0434\u0430\u0435\u0442 \u0432\u044B\u0434\u0430\u0447\u0438" });
    const ins = await supabaseFetch("echo_orders", "", { method: "POST", body: JSON.stringify({
      organization_id: session.organizationId,
      student_id: studentId,
      product_id: productId,
      branch_id: card.branchId,
      student_name: card.name,
      branch_name: card.branchName,
      group_name: card.groupName,
      teacher_name: card.teacherName,
      product_name: prod.name,
      product_photo: prod.photo,
      echo_price: prod.echoPrice,
      balance_at_request: card.balance,
      status: "pending"
    }) });
    res.status(201).json({ order: ins[0] ? echoOrderOut(ins[0]) : null });
  }));
  app2.get("/api/mvp/shop/echo/orders", ah(async (req, res) => {
    const session = getSession(req);
    const studentId = String(req.query.studentId || "");
    const rows = supabaseEnabled ? await supabaseFetch("echo_orders", `select=*&organization_id=eq.${session.organizationId}&order=created_at.desc`) : mockEchoOrders.slice();
    if (studentId) {
      if (session.role === "student" && session.studentId && session.studentId !== studentId) {
        return res.status(403).json({ error: "\u041D\u0435\u0442 \u0434\u043E\u0441\u0442\u0443\u043F\u0430 \u043A \u0447\u0443\u0436\u0438\u043C \u0437\u0430\u044F\u0432\u043A\u0430\u043C" });
      }
      return res.json({ orders: rows.filter((o) => (o.studentId ?? o.student_id) === studentId).map(echoOrderOut) });
    }
    if (!echoOrderStaff.includes(session.role)) return res.status(403).json({ error: "\u0414\u043E\u0441\u0442\u0443\u043F\u043D\u043E \u0432\u043B\u0430\u0434\u0435\u043B\u044C\u0446\u0443, \u0443\u043F\u0440\u0430\u0432\u043B\u044F\u044E\u0449\u0435\u043C\u0443 \u0438 \u0430\u0434\u043C\u0438\u043D\u0438\u0441\u0442\u0440\u0430\u0442\u043E\u0440\u0443" });
    const scoped = rows.filter((o) => canSeeBranch(session, o.branchId ?? o.branch_id));
    res.json({ orders: scoped.map(echoOrderOut) });
  }));
  app2.patch("/api/mvp/shop/echo/orders/:id", ah(async (req, res) => {
    const session = getSession(req);
    if (!echoOrderStaff.includes(session.role)) return res.status(403).json({ error: "\u041D\u0435\u0434\u043E\u0441\u0442\u0430\u0442\u043E\u0447\u043D\u043E \u043F\u0440\u0430\u0432" });
    const action = String((req.body || {}).action || "");
    const reason = String((req.body || {}).reason || "").trim() || null;
    if (!["issue", "cancel"].includes(action)) return res.status(400).json({ error: "\u041D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u043E\u0435 \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0435" });
    let order;
    if (!supabaseEnabled) {
      order = mockEchoOrders.find((o) => o.id === req.params.id);
    } else {
      const rows = await supabaseFetch("echo_orders", `select=*&id=eq.${req.params.id}&organization_id=eq.${session.organizationId}&limit=1`);
      order = rows[0];
    }
    if (!order) return res.status(404).json({ error: "\u0417\u0430\u044F\u0432\u043A\u0430 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u0430" });
    const oBranch = order.branchId ?? order.branch_id;
    if (!canSeeBranch(session, oBranch)) return res.status(403).json({ error: "\u0417\u0430\u044F\u0432\u043A\u0430 \u0434\u0440\u0443\u0433\u043E\u0433\u043E \u0444\u0438\u043B\u0438\u0430\u043B\u0430" });
    if (order.status !== "pending") return res.status(400).json({ error: "\u0417\u0430\u044F\u0432\u043A\u0430 \u0443\u0436\u0435 \u043E\u0431\u0440\u0430\u0431\u043E\u0442\u0430\u043D\u0430" });
    const studentId = order.studentId ?? order.student_id;
    const productId = order.productId ?? order.product_id;
    const price = Number(order.echoPrice ?? order.echo_price) || 0;
    const productName = order.productName ?? order.product_name ?? "\u0422\u043E\u0432\u0430\u0440";
    const nowIso = (/* @__PURE__ */ new Date()).toISOString();
    if (action === "cancel") {
      if (!supabaseEnabled) {
        order.status = "cancelled";
        order.cancelReason = reason;
        order.decidedBy = session.fullName || null;
        order.decidedAt = nowIso;
        return res.json({ ok: true, order: echoOrderOut(order) });
      }
      await supabaseFetch("echo_orders", `id=eq.${req.params.id}&organization_id=eq.${session.organizationId}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ status: "cancelled", cancel_reason: reason, decided_by: session.fullName || null, decided_at: nowIso }) });
      return res.json({ ok: true, status: "cancelled" });
    }
    if (productId && await productStock(session, productId) <= 0) return res.status(400).json({ error: "\u0422\u043E\u0432\u0430\u0440\u0430 \u043D\u0435\u0442 \u043D\u0430 \u0441\u043A\u043B\u0430\u0434\u0435 \u2014 \u0432\u044B\u0434\u0430\u0447\u0430 \u043D\u0435\u0432\u043E\u0437\u043C\u043E\u0436\u043D\u0430" });
    try {
      await applyEcho(session, studentId, -price, "purchase", `\u041C\u0430\u0433\u0430\u0437\u0438\u043D: ${productName}`, productId || null);
    } catch (e) {
      if (e?.message === "INSUFFICIENT") return res.status(400).json({ error: "\u0423 \u0443\u0447\u0435\u043D\u0438\u043A\u0430 \u043D\u0435\u0434\u043E\u0441\u0442\u0430\u0442\u043E\u0447\u043D\u043E \u042D\u0445\u043E\u0411\u0430\u043A\u0441\u043E\u0432" });
      if (e?.message === "NOT_FOUND") return res.status(404).json({ error: "\u0423\u0447\u0435\u043D\u0438\u043A \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D" });
      throw e;
    }
    if (productId) {
      if (!supabaseEnabled) {
        mockWriteoffs.unshift({ id: uid(), productId, qty: 1, reason: "\u0412\u044B\u0434\u0430\u0447\u0430 \u0438\u0437 \u043C\u0430\u0433\u0430\u0437\u0438\u043D\u0430 \u042D\u0445\u043E\u0411\u0430\u043A\u0441\u043E\u0432", writeoffDate: todayStr(), comment: `\u0417\u0430\u044F\u0432\u043A\u0430 ${order.studentName ?? order.student_name ?? ""}`.trim(), branchId: oBranch || demoBranchAlmaty });
      } else {
        await supabaseFetch("product_writeoffs", "", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ organization_id: session.organizationId, branch_id: oBranch || null, product_id: productId, qty: 1, reason: "\u0412\u044B\u0434\u0430\u0447\u0430 \u0438\u0437 \u043C\u0430\u0433\u0430\u0437\u0438\u043D\u0430 \u042D\u0445\u043E\u0411\u0430\u043A\u0441\u043E\u0432", writeoff_date: todayStr(), comment: `\u0417\u0430\u044F\u0432\u043A\u0430 \u043C\u0430\u0433\u0430\u0437\u0438\u043D\u0430: ${order.student_name || ""}`.trim() }) }).catch((e) => console.warn("[echo-order] \u0441\u043F\u0438\u0441\u0430\u043D\u0438\u0435 \u0441\u043A\u043B\u0430\u0434\u0430 \u043D\u0435 \u043F\u0440\u043E\u0448\u043B\u043E:", e?.message || e));
      }
    }
    if (!supabaseEnabled) {
      order.status = "issued";
      order.decidedBy = session.fullName || null;
      order.decidedAt = nowIso;
      return res.json({ ok: true, order: echoOrderOut(order) });
    }
    await supabaseFetch("echo_orders", `id=eq.${req.params.id}&organization_id=eq.${session.organizationId}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ status: "issued", decided_by: session.fullName || null, decided_at: nowIso }) });
    res.json({ ok: true, status: "issued" });
  }));
  app2.post("/api/mvp/marketing/broadcast", ah(async (req, res) => {
    const session = getSession(req);
    if (session.role !== "owner") return res.status(403).json({ error: "\u0414\u043E\u0441\u0442\u0443\u043F\u043D\u043E \u0432\u043B\u0430\u0434\u0435\u043B\u044C\u0446\u0443" });
    const token = process.env.WHATSAPP_TOKEN, phoneId = process.env.WHATSAPP_PHONE_ID;
    if (!token || !phoneId) return res.status(503).json({ error: "\u0410\u0432\u0442\u043E\u0440\u0430\u0441\u0441\u044B\u043B\u043A\u0430 \u043D\u0435 \u043D\u0430\u0441\u0442\u0440\u043E\u0435\u043D\u0430 (\u043D\u0435\u0442 WHATSAPP_TOKEN / WHATSAPP_PHONE_ID)" });
    const recipients = Array.isArray((req.body || {}).recipients) ? req.body.recipients : [];
    const template = String((req.body || {}).template || "");
    if (recipients.length === 0) return res.status(400).json({ error: "\u041D\u0435\u0442 \u043F\u043E\u043B\u0443\u0447\u0430\u0442\u0435\u043B\u0435\u0439" });
    const results = [];
    for (const r of recipients) {
      const phone = String(r.phone || "").replace(/\D/g, "");
      if (!phone) {
        results.push({ phone: r.phone, ok: false, error: "\u043D\u0435\u0442 \u0442\u0435\u043B\u0435\u0444\u043E\u043D\u0430" });
        continue;
      }
      const text = template.replace(/\{имя\}/g, String(r.name || "").split(" ")[0] || "");
      try {
        const resp = await fetch(`https://graph.facebook.com/v20.0/${phoneId}/messages`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ messaging_product: "whatsapp", to: phone, type: "text", text: { body: text } })
        });
        results.push({ phone, ok: resp.ok });
      } catch (e) {
        results.push({ phone, ok: false, error: e?.message });
      }
    }
    res.json({ sent: results.filter((x) => x.ok).length, total: recipients.length, results });
  }));
  app2.get("/api/mvp/products/sales", ah(async (req, res) => {
    const session = getSession(req);
    if (session.role === "teacher") return res.status(403).json({ error: "\u0420\u0430\u0437\u0434\u0435\u043B \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D" });
    const { products, sales } = await loadProducts(session);
    const nameOf = (id) => products.find((p) => p.id === id)?.name || "\u2014";
    const q = req.query;
    let from = q.from, to = q.to;
    if (session.role === "admin") {
      from = todayStr();
      to = todayStr();
    }
    let list = sales;
    if (from) list = list.filter((s) => s.date >= from);
    if (to) list = list.filter((s) => s.date <= to);
    res.json({ sales: list.map((s) => ({ ...s, productName: nameOf(s.productId) })) });
  }));
  app2.get("/api/mvp/products/stock", ah(async (req, res) => {
    const session = getSession(req);
    if (session.role !== "owner" && session.role !== "branch_manager") return res.status(403).json({ error: "\u041E\u0441\u0442\u0430\u0442\u043A\u0438 \u0434\u043E\u0441\u0442\u0443\u043F\u043D\u044B \u0432\u043B\u0430\u0434\u0435\u043B\u044C\u0446\u0443 \u0438 \u0443\u043F\u0440\u0430\u0432\u043B\u044F\u044E\u0449\u0435\u043C\u0443" });
    const { products, sales, receipts, writeoffs } = await loadProducts(session);
    const rows = products.map((pr) => {
      const received = receipts.filter((r) => r.productId === pr.id).reduce((s, r) => s + r.qty, 0);
      const sold = sales.filter((s) => s.productId === pr.id).reduce((s, x) => s + x.qty, 0);
      const written = writeoffs.filter((w) => w.productId === pr.id).reduce((s, x) => s + x.qty, 0);
      const balance = received - sold - written;
      return { productId: pr.id, name: pr.name, sku: pr.sku, received, sold, written, balance, costPrice: pr.costPrice, salePrice: pr.salePrice, stockValue: balance * pr.costPrice, retailValue: balance * pr.salePrice, minStock: pr.minStock, low: balance <= pr.minStock };
    });
    const summary = {
      units: rows.reduce((s, r) => s + Math.max(0, r.balance), 0),
      stockValue: rows.reduce((s, r) => s + Math.max(0, r.balance) * r.costPrice, 0),
      retailValue: rows.reduce((s, r) => s + Math.max(0, r.balance) * r.salePrice, 0),
      positions: rows.filter((r) => r.balance > 0).length
    };
    res.json({ stock: rows, summary });
  }));
  app2.get("/api/mvp/products/writeoffs", ah(async (req, res) => {
    const session = getSession(req);
    if (session.role !== "owner" && session.role !== "branch_manager") return res.status(403).json({ error: "\u0414\u043E\u0441\u0442\u0443\u043F\u043D\u043E \u0432\u043B\u0430\u0434\u0435\u043B\u044C\u0446\u0443 \u0438 \u0443\u043F\u0440\u0430\u0432\u043B\u044F\u044E\u0449\u0435\u043C\u0443" });
    const { products, writeoffs } = await loadProducts(session);
    const nameOf = (id) => products.find((p) => p.id === id)?.name || "\u2014";
    res.json({ writeoffs: writeoffs.map((w) => ({ ...w, productName: nameOf(w.productId) })) });
  }));
  app2.get("/api/mvp/products/receipts", ah(async (req, res) => {
    const session = getSession(req);
    if (session.role !== "owner" && session.role !== "branch_manager") return res.status(403).json({ error: "\u0414\u043E\u0441\u0442\u0443\u043F\u043D\u043E \u0432\u043B\u0430\u0434\u0435\u043B\u044C\u0446\u0443 \u0438 \u0443\u043F\u0440\u0430\u0432\u043B\u044F\u044E\u0449\u0435\u043C\u0443" });
    const { products, receipts } = await loadProducts(session);
    const nameOf = (id) => products.find((p) => p.id === id)?.name || "\u2014";
    res.json({ receipts: receipts.map((r) => ({ ...r, productName: nameOf(r.productId) })) });
  }));
  app2.get("/api/mvp/products/overview", ah(async (req, res) => {
    const session = getSession(req);
    if (session.role !== "owner" && session.role !== "branch_manager") return res.status(403).json({ error: "\u0410\u043D\u0430\u043B\u0438\u0442\u0438\u043A\u0430 \u0434\u043E\u0441\u0442\u0443\u043F\u043D\u0430 \u0432\u043B\u0430\u0434\u0435\u043B\u044C\u0446\u0443 \u0438 \u0443\u043F\u0440\u0430\u0432\u043B\u044F\u044E\u0449\u0435\u043C\u0443" });
    const q = req.query;
    const r = periodRanges(q.period, q.from, q.to);
    const { products, sales, receipts, writeoffs } = await loadProducts(session);
    const costOf = (id) => products.find((p) => p.id === id)?.costPrice || 0;
    const sumRev = (range) => sales.filter((s) => inRange(s.date, range)).reduce((acc, s) => acc + s.amount, 0);
    const curRev = sumRev(r.cur), prevRev = sumRev(r.prev), yoyRev = sumRev(r.yoy);
    const curSales = sales.filter((s) => inRange(s.date, r.cur));
    const unitsSold = curSales.reduce((s, x) => s + x.qty, 0);
    const avgCheck = curSales.length > 0 ? Math.round(curRev / curSales.length) : 0;
    const grossProfit = curSales.reduce((acc, s) => acc + (s.amount - s.qty * costOf(s.productId)), 0);
    const margin = curRev > 0 ? Math.round(grossProfit / curRev * 100) : 0;
    const lowStock = products.map((pr) => ({ id: pr.id, name: pr.name, stock: stockBalance(pr.id, sales, receipts, writeoffs), minStock: pr.minStock })).filter((x) => x.stock <= x.minStock);
    const top = products.map((pr) => ({ id: pr.id, name: pr.name, revenue: sales.filter((s) => s.productId === pr.id && inRange(s.date, r.cur)).reduce((a, s) => a + s.amount, 0), qty: sales.filter((s) => s.productId === pr.id && inRange(s.date, r.cur)).reduce((a, s) => a + s.qty, 0) })).filter((x) => x.revenue > 0).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
    let stockUnits = 0, stockValue = 0, retailValue = 0;
    for (const pr of products) {
      const bal = Math.max(0, stockBalance(pr.id, sales, receipts, writeoffs));
      stockUnits += bal;
      stockValue += bal * pr.costPrice;
      retailValue += bal * pr.salePrice;
    }
    const months = [];
    const md = /* @__PURE__ */ new Date();
    md.setDate(1);
    for (let i = 5; i >= 0; i--) {
      const d = new Date(md.getFullYear(), md.getMonth() - i, 1);
      months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    }
    const byMonth = months.map((mo) => ({ month: mo, amount: sales.filter((s) => String(s.date).slice(0, 7) === mo).reduce((acc, s) => acc + s.amount, 0) }));
    res.json({
      revenue: { total: curRev, momPct: pctDelta(curRev, prevRev), yoyPct: pctDelta(curRev, yoyRev) },
      unitsSold,
      avgCheck,
      grossProfit,
      margin,
      lowStock,
      top,
      byMonth,
      stockUnits,
      stockValue,
      retailValue
    });
  }));
  app2.post("/api/mvp/products", ah(async (req, res) => {
    const session = getSession(req);
    if (session.role !== "owner" && session.role !== "branch_manager") return res.status(403).json({ error: "\u0421\u043E\u0437\u0434\u0430\u0432\u0430\u0442\u044C \u0442\u043E\u0432\u0430\u0440\u044B \u043C\u043E\u0436\u0435\u0442 \u0432\u043B\u0430\u0434\u0435\u043B\u0435\u0446 \u0438\u043B\u0438 \u0443\u043F\u0440\u0430\u0432\u043B\u044F\u044E\u0449\u0438\u0439" });
    const p = req.body || {};
    if (!String(p.name || "").trim()) return res.status(400).json({ error: "\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 \u0442\u043E\u0432\u0430\u0440\u0430" });
    if (!supabaseEnabled) {
      const rec = { id: uid(), name: String(p.name).trim(), category: p.category || null, sku: p.sku || null, salePrice: Number(p.salePrice) || 0, costPrice: Number(p.costPrice) || 0, minStock: Number(p.minStock) || 0, comment: p.comment || null, description: p.description || null, echoPrice: Number(p.echoPrice) || 0, isActive: p.isActive !== false, photoUrl: p.photoUrl || null, branchId: p.branchId || session.dbBranchId || demoBranchAlmaty };
      mockProducts.unshift(rec);
      return res.status(201).json({ product: { ...prodOut(rec), stock: 0, low: 0 <= rec.minStock } });
    }
    const inserted = await supabaseFetch("products", "", {
      method: "POST",
      body: JSON.stringify({ organization_id: session.organizationId, branch_id: p.branchId || session.dbBranchId || null, name: String(p.name).trim(), category: p.category || null, sku: p.sku || null, sale_price: Number(p.salePrice) || 0, cost_price: Number(p.costPrice) || 0, min_stock: Number(p.minStock) || 0, comment: p.comment || null, description: p.description || null, echo_price: Number(p.echoPrice) || 0, is_active: p.isActive !== false, photo_url: p.photoUrl || null })
    });
    res.status(201).json({ product: { ...prodOut(inserted[0]), stock: 0, low: 0 <= (Number(p.minStock) || 0) } });
  }));
  app2.patch("/api/mvp/products/:id", ah(async (req, res) => {
    const session = getSession(req);
    if (session.role !== "owner" && session.role !== "branch_manager") return res.status(403).json({ error: "\u041D\u0435\u0434\u043E\u0441\u0442\u0430\u0442\u043E\u0447\u043D\u043E \u043F\u0440\u0430\u0432" });
    const p = req.body || {};
    if (!supabaseEnabled) {
      const rec = mockProducts.find((x) => x.id === req.params.id);
      if (!rec) return res.status(404).json({ error: "\u0422\u043E\u0432\u0430\u0440 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D" });
      ["name", "category", "sku", "comment", "description", "photoUrl"].forEach((k) => {
        if (p[k] !== void 0) rec[k] = p[k];
      });
      if (p.salePrice !== void 0) rec.salePrice = Number(p.salePrice) || 0;
      if (p.costPrice !== void 0) rec.costPrice = Number(p.costPrice) || 0;
      if (p.minStock !== void 0) rec.minStock = Number(p.minStock) || 0;
      if (p.echoPrice !== void 0) rec.echoPrice = Number(p.echoPrice) || 0;
      if (p.isActive !== void 0) rec.isActive = !!p.isActive;
      return res.json({ product: prodOut(rec) });
    }
    const patch = { updated_at: (/* @__PURE__ */ new Date()).toISOString() };
    if (p.name !== void 0) patch.name = p.name;
    if (p.category !== void 0) patch.category = p.category || null;
    if (p.sku !== void 0) patch.sku = p.sku || null;
    if (p.photoUrl !== void 0) patch.photo_url = p.photoUrl || null;
    if (p.salePrice !== void 0) patch.sale_price = Number(p.salePrice) || 0;
    if (p.costPrice !== void 0) patch.cost_price = Number(p.costPrice) || 0;
    if (p.minStock !== void 0) patch.min_stock = Number(p.minStock) || 0;
    if (p.comment !== void 0) patch.comment = p.comment || null;
    if (p.description !== void 0) patch.description = p.description || null;
    if (p.echoPrice !== void 0) patch.echo_price = Number(p.echoPrice) || 0;
    if (p.isActive !== void 0) patch.is_active = !!p.isActive;
    const rows = await supabaseFetch("products", `id=eq.${req.params.id}&organization_id=eq.${session.organizationId}`, { method: "PATCH", body: JSON.stringify(patch) });
    res.json({ product: rows[0] ? prodOut(rows[0]) : null });
  }));
  app2.post("/api/mvp/products/sales", ah(async (req, res) => {
    const session = getSession(req);
    if (session.role === "teacher") return res.status(403).json({ error: "\u0420\u0430\u0437\u0434\u0435\u043B \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D" });
    const p = req.body || {};
    const qty = Number(p.qty) || 1;
    if (!p.productId) return res.status(400).json({ error: "\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0442\u043E\u0432\u0430\u0440" });
    if (qty <= 0) return res.status(400).json({ error: "\u041A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u043E \u0434\u043E\u043B\u0436\u043D\u043E \u0431\u044B\u0442\u044C \u0431\u043E\u043B\u044C\u0448\u0435 \u043D\u0443\u043B\u044F" });
    if (!supabaseEnabled) {
      const prod2 = mockProducts.find((x) => x.id === p.productId);
      const amount2 = Number(p.amount) || qty * (prod2?.salePrice || 0);
      const rec = { id: uid(), productId: p.productId, qty, amount: amount2, method: p.method || "cash", soldBy: p.soldBy || session.fullName, saleDate: p.date || todayStr(), branchId: p.branchId || session.dbBranchId || demoBranchAlmaty, comment: p.comment || null };
      mockSales.unshift(rec);
      return res.status(201).json({ sale: { id: rec.id, productId: rec.productId, productName: prod2?.name || "\u2014", qty, amount: amount2, method: rec.method, soldBy: rec.soldBy, date: rec.saleDate } });
    }
    const prodRows = await supabaseFetch("products", `select=*&id=eq.${p.productId}&organization_id=eq.${session.organizationId}`);
    const prod = prodRows[0];
    const amount = Number(p.amount) || qty * (Number(prod?.sale_price) || 0);
    const inserted = await supabaseFetch("product_sales", "", {
      method: "POST",
      body: JSON.stringify({ organization_id: session.organizationId, branch_id: p.branchId || session.dbBranchId || null, product_id: p.productId, qty, amount, method: p.method || "cash", sold_by: p.soldBy || session.fullName, sale_date: p.date || todayStr(), comment: p.comment || null })
    });
    res.status(201).json({ sale: { id: inserted[0].id, productId: p.productId, productName: prod?.name || "\u2014", qty, amount, method: inserted[0].method, soldBy: inserted[0].sold_by, date: inserted[0].sale_date } });
  }));
  app2.post("/api/mvp/products/receipts", ah(async (req, res) => {
    const session = getSession(req);
    if (session.role !== "owner" && session.role !== "branch_manager") return res.status(403).json({ error: "\u041F\u043E\u0441\u0442\u0443\u043F\u043B\u0435\u043D\u0438\u044F \u043E\u0444\u043E\u0440\u043C\u043B\u044F\u0435\u0442 \u0432\u043B\u0430\u0434\u0435\u043B\u0435\u0446 \u0438\u043B\u0438 \u0443\u043F\u0440\u0430\u0432\u043B\u044F\u044E\u0449\u0438\u0439" });
    const p = req.body || {};
    const qty = Number(p.qty) || 0;
    if (!p.productId) return res.status(400).json({ error: "\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0442\u043E\u0432\u0430\u0440" });
    if (qty <= 0) return res.status(400).json({ error: "\u041A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u043E \u0434\u043E\u043B\u0436\u043D\u043E \u0431\u044B\u0442\u044C \u0431\u043E\u043B\u044C\u0448\u0435 \u043D\u0443\u043B\u044F" });
    if (!supabaseEnabled) {
      const rec = { id: uid(), productId: p.productId, qty, costPrice: Number(p.costPrice) || 0, movementDate: p.date || todayStr(), comment: p.comment || null, branchId: p.branchId || session.dbBranchId || demoBranchAlmaty };
      mockReceipts.unshift(rec);
      return res.status(201).json({ receipt: { id: rec.id, productId: rec.productId, qty, costPrice: rec.costPrice, date: rec.movementDate, comment: rec.comment } });
    }
    const inserted = await supabaseFetch("product_stock_movements", "", {
      method: "POST",
      body: JSON.stringify({ organization_id: session.organizationId, branch_id: p.branchId || session.dbBranchId || null, product_id: p.productId, qty, cost_price: Number(p.costPrice) || null, movement_date: p.date || todayStr(), comment: p.comment || null })
    });
    res.status(201).json({ receipt: { id: inserted[0].id, productId: p.productId, qty, costPrice: Number(inserted[0].cost_price) || 0, date: inserted[0].movement_date, comment: inserted[0].comment } });
  }));
  app2.post("/api/mvp/products/writeoffs", ah(async (req, res) => {
    const session = getSession(req);
    if (session.role !== "owner" && session.role !== "branch_manager") return res.status(403).json({ error: "\u0421\u043F\u0438\u0441\u0430\u043D\u0438\u044F \u043E\u0444\u043E\u0440\u043C\u043B\u044F\u0435\u0442 \u0432\u043B\u0430\u0434\u0435\u043B\u0435\u0446 \u0438\u043B\u0438 \u0443\u043F\u0440\u0430\u0432\u043B\u044F\u044E\u0449\u0438\u0439" });
    const p = req.body || {};
    const qty = Number(p.qty) || 0;
    if (!p.productId) return res.status(400).json({ error: "\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0442\u043E\u0432\u0430\u0440" });
    if (qty <= 0) return res.status(400).json({ error: "\u041A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u043E \u0434\u043E\u043B\u0436\u043D\u043E \u0431\u044B\u0442\u044C \u0431\u043E\u043B\u044C\u0448\u0435 \u043D\u0443\u043B\u044F" });
    if (!supabaseEnabled) {
      const rec = { id: uid(), productId: p.productId, qty, reason: p.reason || null, writeoffDate: p.date || todayStr(), comment: p.comment || null, branchId: p.branchId || session.dbBranchId || demoBranchAlmaty };
      mockWriteoffs.unshift(rec);
      return res.status(201).json({ writeoff: { id: rec.id, productId: rec.productId, qty, reason: rec.reason, date: rec.writeoffDate, comment: rec.comment } });
    }
    const inserted = await supabaseFetch("product_writeoffs", "", {
      method: "POST",
      body: JSON.stringify({ organization_id: session.organizationId, branch_id: p.branchId || session.dbBranchId || null, product_id: p.productId, qty, reason: p.reason || null, writeoff_date: p.date || todayStr(), comment: p.comment || null })
    });
    res.status(201).json({ writeoff: { id: inserted[0].id, productId: p.productId, qty, reason: inserted[0].reason, date: inserted[0].writeoff_date, comment: inserted[0].comment } });
  }));
  app2.delete("/api/mvp/products/writeoffs/:id", ah(async (req, res) => {
    const session = getSession(req);
    if (session.role !== "owner" && session.role !== "branch_manager") return res.status(403).json({ error: "\u041D\u0435\u0434\u043E\u0441\u0442\u0430\u0442\u043E\u0447\u043D\u043E \u043F\u0440\u0430\u0432" });
    if (!supabaseEnabled) {
      const i = mockWriteoffs.findIndex((x) => x.id === req.params.id);
      if (i >= 0) mockWriteoffs.splice(i, 1);
      return res.json({ ok: true });
    }
    await supabaseFetch("product_writeoffs", `id=eq.${req.params.id}&organization_id=eq.${session.organizationId}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
    res.json({ ok: true });
  }));
  const COMP_SCHEMES = ["percent", "per_lesson", "fixed", "mixed"];
  const DEFAULT_ONBOARDING = [
    { key: "doc_signed", title: "\u041F\u043E\u0434\u043F\u0438\u0441\u0430\u043D \u0434\u043E\u0433\u043E\u0432\u043E\u0440" },
    { key: "intro_training", title: "\u041F\u0440\u043E\u0439\u0434\u0435\u043D\u043E \u0432\u0432\u043E\u0434\u043D\u043E\u0435 \u043E\u0431\u0443\u0447\u0435\u043D\u0438\u0435" },
    { key: "first_lesson", title: "\u041F\u0440\u043E\u0432\u0435\u0434\u0435\u043D\u043E \u043F\u0435\u0440\u0432\u043E\u0435 \u0437\u0430\u043D\u044F\u0442\u0438\u0435" },
    { key: "mentor_review", title: "\u041E\u0446\u0435\u043D\u043A\u0430 \u043D\u0430\u0441\u0442\u0430\u0432\u043D\u0438\u043A\u0430" },
    { key: "probation_passed", title: "\u0418\u0441\u043F\u044B\u0442\u0430\u0442\u0435\u043B\u044C\u043D\u044B\u0439 \u0441\u0440\u043E\u043A \u043F\u0440\u043E\u0439\u0434\u0435\u043D" }
  ];
  const defaultComp = () => ({ scheme: "percent", baseSalary: 0, percent: 0, perLessonRate: 0, comment: null });
  const compOut = (r) => ({ scheme: r.scheme || "percent", baseSalary: Number(r.base_salary) || 0, percent: Number(r.percent) || 0, perLessonRate: Number(r.per_lesson_rate) || 0, comment: r.comment ?? null });
  const onbOut = (r) => ({ id: r.id, stepKey: r.step_key ?? r.stepKey, title: r.title, done: !!r.done, doneAt: r.done_at ?? r.doneAt ?? null, sort: r.sort ?? 0 });
  const payoutOut = (r) => ({ id: r.id, periodStart: r.period_start ?? r.periodStart, periodEnd: r.period_end ?? r.periodEnd, amount: Number(r.amount) || 0, status: r.status || "planned", comment: r.comment ?? null, createdAt: r.created_at ?? r.createdAt });
  const mockTeacherComp = {};
  const mockTeacherPayouts = [];
  const mockTeacherOnboarding = {};
  const seedMockOnboarding = (tid) => {
    if (!mockTeacherOnboarding[tid]) {
      mockTeacherOnboarding[tid] = DEFAULT_ONBOARDING.map((s, i) => ({ id: uid(), stepKey: s.key, title: s.title, done: i < 3, doneAt: i < 3 ? (/* @__PURE__ */ new Date()).toISOString() : null, sort: i + 1 }));
    }
    return mockTeacherOnboarding[tid];
  };
  app2.get("/api/mvp/teachers/:id/card", ah(async (req, res) => {
    const session = getSession(req);
    if (session.role !== "owner") return res.status(403).json({ error: "\u041A\u0430\u0440\u0442\u043E\u0447\u043A\u0430 \u043F\u0435\u0434\u0430\u0433\u043E\u0433\u0430 \u0434\u043E\u0441\u0442\u0443\u043F\u043D\u0430 \u0432\u043B\u0430\u0434\u0435\u043B\u044C\u0446\u0443" });
    const tid = req.params.id;
    const q = req.query;
    const r = periodRanges(q.period, q.from, q.to);
    if (!supabaseEnabled) {
      return res.json({
        compensation: mockTeacherComp[tid] || defaultComp(),
        onboarding: seedMockOnboarding(tid),
        payouts: mockTeacherPayouts.filter((p) => p.teacherId === tid),
        lessonsCompleted: 0,
        period: r.cur
      });
    }
    const orgF = `organization_id=eq.${session.organizationId}`;
    const [compRows, onbRows, payoutRows, lessons] = await Promise.all([
      supabaseFetch("teacher_compensation", `select=*&${orgF}&teacher_id=eq.${tid}&limit=1`),
      supabaseFetch("teacher_onboarding", `select=*&${orgF}&teacher_id=eq.${tid}&order=sort.asc`),
      supabaseFetch("teacher_payouts", `select=*&${orgF}&teacher_id=eq.${tid}&order=created_at.desc&limit=200`),
      // «Проведённые» = прошедшие непроведённые уроки (ends_at в прошлом, не отменены) —
      // авто-учёт без ручного закрытия. Физическое закрытие — POST /lessons/autoclose.
      supabaseFetch("schedule_lessons", `select=id&teacher_id=eq.${tid}&status=neq.cancelled&ends_at=lt.${(/* @__PURE__ */ new Date()).toISOString()}&starts_at=gte.${r.cur.start}T00:00:00&starts_at=lte.${r.cur.end}T23:59:59`)
    ]);
    let onboarding = onbRows;
    if (onboarding.length === 0) {
      const rows = DEFAULT_ONBOARDING.map((s, i) => ({ organization_id: session.organizationId, teacher_id: tid, step_key: s.key, title: s.title, done: false, sort: i + 1 }));
      try {
        onboarding = await supabaseFetch("teacher_onboarding", "", { method: "POST", body: JSON.stringify(rows) });
      } catch {
        onboarding = [];
      }
      onboarding = (onboarding || []).sort((a, b) => (a.sort || 0) - (b.sort || 0));
    }
    res.json({
      compensation: compRows[0] ? compOut(compRows[0]) : defaultComp(),
      onboarding: onboarding.map(onbOut),
      payouts: payoutRows.map(payoutOut),
      lessonsCompleted: lessons.length,
      period: r.cur
    });
  }));
  app2.patch("/api/mvp/teachers/:id/compensation", ah(async (req, res) => {
    const session = getSession(req);
    if (session.role !== "owner") return res.status(403).json({ error: "\u0418\u0437\u043C\u0435\u043D\u044F\u0442\u044C \u043C\u043E\u0436\u0435\u0442 \u0442\u043E\u043B\u044C\u043A\u043E \u0432\u043B\u0430\u0434\u0435\u043B\u0435\u0446" });
    const tid = req.params.id;
    const p = req.body || {};
    const payload = {
      scheme: COMP_SCHEMES.includes(p.scheme) ? p.scheme : "percent",
      base_salary: Number(p.baseSalary) || 0,
      percent: Number(p.percent) || 0,
      per_lesson_rate: Number(p.perLessonRate) || 0,
      comment: p.comment || null
    };
    if (!supabaseEnabled) {
      mockTeacherComp[tid] = { scheme: payload.scheme, baseSalary: payload.base_salary, percent: payload.percent, perLessonRate: payload.per_lesson_rate, comment: payload.comment };
      return res.json({ compensation: mockTeacherComp[tid] });
    }
    const orgF = `organization_id=eq.${session.organizationId}`;
    const existing = await supabaseFetch("teacher_compensation", `select=id&${orgF}&teacher_id=eq.${tid}&limit=1`);
    let rows;
    if (existing[0]) {
      rows = await supabaseFetch("teacher_compensation", `id=eq.${existing[0].id}`, { method: "PATCH", body: JSON.stringify({ ...payload, updated_at: (/* @__PURE__ */ new Date()).toISOString() }) });
    } else {
      rows = await supabaseFetch("teacher_compensation", "", { method: "POST", body: JSON.stringify({ organization_id: session.organizationId, teacher_id: tid, ...payload }) });
    }
    res.json({ compensation: rows[0] ? compOut(rows[0]) : defaultComp() });
  }));
  app2.post("/api/mvp/teachers/:id/payouts", ah(async (req, res) => {
    const session = getSession(req);
    if (session.role !== "owner") return res.status(403).json({ error: "\u0414\u043E\u0441\u0442\u0443\u043F\u043D\u043E \u0442\u043E\u043B\u044C\u043A\u043E \u0432\u043B\u0430\u0434\u0435\u043B\u044C\u0446\u0443" });
    const tid = req.params.id;
    const p = req.body || {};
    const amount = Number(p.amount) || 0;
    const common = { periodStart: p.periodStart || todayStr(), periodEnd: p.periodEnd || todayStr(), status: p.status === "paid" ? "paid" : "planned", comment: p.comment || null };
    if (!supabaseEnabled) {
      const rec = { id: uid(), teacherId: tid, amount, ...common, createdAt: (/* @__PURE__ */ new Date()).toISOString() };
      mockTeacherPayouts.unshift(rec);
      return res.status(201).json({ payout: rec });
    }
    const inserted = await supabaseFetch("teacher_payouts", "", { method: "POST", body: JSON.stringify({ organization_id: session.organizationId, teacher_id: tid, period_start: common.periodStart, period_end: common.periodEnd, amount, status: common.status, comment: common.comment }) });
    res.status(201).json({ payout: payoutOut(inserted[0]) });
  }));
  app2.delete("/api/mvp/teachers/:id/payouts/:pid", ah(async (req, res) => {
    const session = getSession(req);
    if (session.role !== "owner") return res.status(403).json({ error: "\u0414\u043E\u0441\u0442\u0443\u043F\u043D\u043E \u0442\u043E\u043B\u044C\u043A\u043E \u0432\u043B\u0430\u0434\u0435\u043B\u044C\u0446\u0443" });
    if (!supabaseEnabled) {
      const i = mockTeacherPayouts.findIndex((x) => x.id === req.params.pid);
      if (i >= 0) mockTeacherPayouts.splice(i, 1);
      return res.json({ ok: true });
    }
    await supabaseFetch("teacher_payouts", `id=eq.${req.params.pid}&organization_id=eq.${session.organizationId}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
    res.json({ ok: true });
  }));
  app2.patch("/api/mvp/teachers/:id/onboarding/:stepId", ah(async (req, res) => {
    const session = getSession(req);
    if (session.role !== "owner") return res.status(403).json({ error: "\u0414\u043E\u0441\u0442\u0443\u043F\u043D\u043E \u0442\u043E\u043B\u044C\u043A\u043E \u0432\u043B\u0430\u0434\u0435\u043B\u044C\u0446\u0443" });
    const done = req.body?.done !== false;
    if (!supabaseEnabled) {
      const steps = seedMockOnboarding(req.params.id);
      const st = steps.find((s) => s.id === req.params.stepId);
      if (st) {
        st.done = done;
        st.doneAt = done ? (/* @__PURE__ */ new Date()).toISOString() : null;
      }
      return res.json({ onboarding: steps });
    }
    const rows = await supabaseFetch("teacher_onboarding", `id=eq.${req.params.stepId}&organization_id=eq.${session.organizationId}`, { method: "PATCH", body: JSON.stringify({ done, done_at: done ? (/* @__PURE__ */ new Date()).toISOString() : null }) });
    res.json({ step: rows[0] ? onbOut(rows[0]) : null });
  }));
  app2.get("/api/mvp/teachers/payroll", ah(async (req, res) => {
    const session = getSession(req);
    if (session.role !== "owner" && session.role !== "branch_manager") return res.status(403).json({ error: "\u0412\u0435\u0434\u043E\u043C\u043E\u0441\u0442\u044C \u0434\u043E\u0441\u0442\u0443\u043F\u043D\u0430 \u0432\u043B\u0430\u0434\u0435\u043B\u044C\u0446\u0443 \u0438 \u0443\u043F\u0440\u0430\u0432\u043B\u044F\u044E\u0449\u0435\u043C\u0443" });
    const q = req.query;
    const r = periodRanges(q.period, q.from, q.to);
    if (!supabaseEnabled) {
      const comp2 = {};
      const lessons2 = {};
      const paid2 = {};
      initialTeachers.filter((t) => session.role === "owner" || canSeeBranch(session, t.branchId)).forEach((t) => {
        comp2[t.id] = mockTeacherComp[t.id] || defaultComp();
        lessons2[t.id] = 0;
        paid2[t.id] = mockTeacherPayouts.filter((p) => p.teacherId === t.id && p.status === "paid" && p.periodStart >= r.cur.start && p.periodStart <= r.cur.end).reduce((s, p) => s + p.amount, 0);
      });
      return res.json({ comp: comp2, lessons: lessons2, paid: paid2, period: r.cur });
    }
    const orgF = `organization_id=eq.${session.organizationId}`;
    const branchFilter = session.role === "branch_manager" ? `&branch_id=eq.${session.dbBranchId}` : "";
    const [users, compRows, lessonRows, payoutRows] = await Promise.all([
      supabaseFetch("users", `select=id,branch_id,role&${orgF}&role=eq.teacher`),
      supabaseFetch("teacher_compensation", `select=*&${orgF}`),
      supabaseFetch("schedule_lessons", `select=teacher_id&status=neq.cancelled&ends_at=lt.${(/* @__PURE__ */ new Date()).toISOString()}&starts_at=gte.${r.cur.start}T00:00:00&starts_at=lte.${r.cur.end}T23:59:59${branchFilter}`),
      supabaseFetch("teacher_payouts", `select=teacher_id,amount,status,period_start&${orgF}&status=eq.paid`)
    ]);
    const visible = new Set(users.filter((u) => session.role === "owner" || u.branch_id === session.dbBranchId).map((u) => u.id));
    const comp = {};
    const lessons = {};
    const paid = {};
    compRows.forEach((c) => {
      if (visible.has(c.teacher_id)) comp[c.teacher_id] = compOut(c);
    });
    lessonRows.forEach((l) => {
      if (l.teacher_id && visible.has(l.teacher_id)) lessons[l.teacher_id] = (lessons[l.teacher_id] || 0) + 1;
    });
    payoutRows.forEach((p) => {
      if (visible.has(p.teacher_id) && p.period_start >= r.cur.start && p.period_start <= r.cur.end) paid[p.teacher_id] = (paid[p.teacher_id] || 0) + Number(p.amount);
    });
    res.json({ comp, lessons, paid, period: r.cur });
  }));
  app2.post("/api/mvp/teachers/payroll/accrue", ah(async (req, res) => {
    const session = getSession(req);
    if (session.role !== "owner" && session.role !== "branch_manager") return res.status(403).json({ error: "\u041D\u0430\u0447\u0438\u0441\u043B\u044F\u0442\u044C \u043C\u043E\u0436\u0435\u0442 \u0432\u043B\u0430\u0434\u0435\u043B\u0435\u0446 \u0438\u043B\u0438 \u0443\u043F\u0440\u0430\u0432\u043B\u044F\u044E\u0449\u0438\u0439" });
    const p = req.body || {};
    const items = Array.isArray(p.items) ? p.items : [];
    const status = p.status === "paid" ? "paid" : "planned";
    const ps = p.periodStart || todayStr();
    const pe = p.periodEnd || todayStr();
    const comment = p.comment || "\u041C\u0430\u0441\u0441\u043E\u0432\u043E\u0435 \u043D\u0430\u0447\u0438\u0441\u043B\u0435\u043D\u0438\u0435";
    let valid = items.filter((it) => it.teacherId && Number(it.amount) > 0);
    if (supabaseEnabled && session.role === "branch_manager") {
      const users = await supabaseFetch("users", `select=id,branch_id&organization_id=eq.${session.organizationId}&role=eq.teacher&branch_id=eq.${session.dbBranchId}`);
      const allowed = new Set(users.map((u) => u.id));
      valid = valid.filter((it) => allowed.has(it.teacherId));
    }
    if (valid.length === 0) return res.status(400).json({ error: "\u041D\u0435\u0442 \u0441\u0442\u0440\u043E\u043A \u0434\u043B\u044F \u043D\u0430\u0447\u0438\u0441\u043B\u0435\u043D\u0438\u044F" });
    if (!supabaseEnabled) {
      valid.forEach((it) => mockTeacherPayouts.unshift({ id: uid(), teacherId: it.teacherId, amount: Number(it.amount), periodStart: ps, periodEnd: pe, status, comment, createdAt: (/* @__PURE__ */ new Date()).toISOString() }));
      return res.status(201).json({ created: valid.length });
    }
    await supabaseFetch("teacher_payouts", "", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify(valid.map((it) => ({ organization_id: session.organizationId, teacher_id: it.teacherId, period_start: ps, period_end: pe, amount: Number(it.amount), status, comment })))
    });
    res.status(201).json({ created: valid.length });
  }));
  app2.post("/api/mvp/lessons/autoclose", ah(async (req, res) => {
    const session = getSession(req);
    if (session.role !== "owner" && session.role !== "branch_manager") return res.status(403).json({ error: "\u0414\u043E\u0441\u0442\u0443\u043F\u043D\u043E \u0432\u043B\u0430\u0434\u0435\u043B\u044C\u0446\u0443 \u0438 \u0443\u043F\u0440\u0430\u0432\u043B\u044F\u044E\u0449\u0435\u043C\u0443" });
    if (!supabaseEnabled) return res.json({ closed: 0 });
    const nowIso = (/* @__PURE__ */ new Date()).toISOString();
    const branchFilter = session.role === "branch_manager" ? `&branch_id=eq.${session.dbBranchId}` : "";
    const rows = await supabaseFetch("schedule_lessons", `status=eq.scheduled&ends_at=lt.${nowIso}${branchFilter}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "completed", updated_at: nowIso })
    });
    res.json({ closed: Array.isArray(rows) ? rows.length : 0 });
  }));
  app2.get("/api/mvp/teachers/payouts/history", ah(async (req, res) => {
    const session = getSession(req);
    if (session.role !== "owner" && session.role !== "branch_manager") return res.status(403).json({ error: "\u0414\u043E\u0441\u0442\u0443\u043F\u043D\u043E \u0432\u043B\u0430\u0434\u0435\u043B\u044C\u0446\u0443 \u0438 \u0443\u043F\u0440\u0430\u0432\u043B\u044F\u044E\u0449\u0435\u043C\u0443" });
    const q = req.query;
    const months = Math.min(24, Math.max(1, Number(q.months) || 12));
    const buckets = [];
    const md = /* @__PURE__ */ new Date();
    md.setDate(1);
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(md.getFullYear(), md.getMonth() - i, 1);
      buckets.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    }
    const bucketize = (rows2) => buckets.map((mo) => ({
      month: mo,
      planned: rows2.filter((p) => String(p.periodStart).slice(0, 7) === mo && p.status !== "paid").reduce((s, p) => s + p.amount, 0),
      paid: rows2.filter((p) => String(p.periodStart).slice(0, 7) === mo && p.status === "paid").reduce((s, p) => s + p.amount, 0)
    }));
    if (!supabaseEnabled) {
      return res.json({ months: bucketize(mockTeacherPayouts.map((p) => ({ periodStart: p.periodStart, amount: p.amount, status: p.status }))) });
    }
    const orgF = `organization_id=eq.${session.organizationId}`;
    const payoutRows = await supabaseFetch("teacher_payouts", `select=teacher_id,amount,status,period_start&${orgF}&limit=2000`);
    let rows = payoutRows;
    if (session.role === "branch_manager") {
      const users = await supabaseFetch("users", `select=id&${orgF}&role=eq.teacher&branch_id=eq.${session.dbBranchId}`);
      const allowed = new Set(users.map((u) => u.id));
      rows = payoutRows.filter((p) => allowed.has(p.teacher_id));
    }
    res.json({ months: bucketize(rows.map((p) => ({ periodStart: p.period_start, amount: Number(p.amount), status: p.status }))) });
  }));
  app2.get("/api/mvp/journal/dashboard", ah(async (req, res) => {
    const session = getSession(req);
    const q = req.query;
    const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
    const from = q.from || today;
    const to = q.to || from;
    if (!supabaseEnabled) return res.json(emptyJournalDashboard(from, to));
    const toPlus1 = /* @__PURE__ */ new Date(`${to}T00:00:00.000Z`);
    toPlus1.setUTCDate(toPlus1.getUTCDate() + 1);
    const upper = toPlus1.toISOString().slice(0, 10);
    const lessonFilters = [
      "select=*",
      `starts_at=gte.${from}T00:00:00`,
      `starts_at=lt.${upper}T00:00:00`,
      "order=starts_at.asc"
    ];
    let branchId = q.branchId;
    if (session.role !== "owner") branchId = session.dbBranchId || branchId || void 0;
    if (branchId) lessonFilters.push(`branch_id=eq.${branchId}`);
    if (q.groupId) lessonFilters.push(`group_id=eq.${q.groupId}`);
    try {
      let teacherGroupIds = null;
      if (session.role === "teacher") {
        const myGroups = await supabaseFetch(
          "groups",
          `select=id&teacher_id=eq.${session.userId}`
        ).catch(() => []);
        teacherGroupIds = new Set(myGroups.map((g2) => g2.id));
      }
      const lessonsRaw = await supabaseFetch("schedule_lessons", lessonFilters.join("&"));
      const lessons = teacherGroupIds ? lessonsRaw.filter((l) => teacherGroupIds.has(l.group_id)) : lessonsRaw;
      const lessonIds = lessons.map((l) => l.id);
      let attendance = [];
      if (lessonIds.length) {
        attendance = await supabaseFetch(
          "attendance",
          `select=*&lesson_id=in.(${lessonIds.join(",")})`
        ).catch(() => []);
      }
      const orgFilter = `organization_id=eq.${session.organizationId}`;
      const [students, subs, groups, users] = await Promise.all([
        supabaseFetch("students", `select=*&${orgFilter}&status=neq.archived&archived_at=is.null`).catch(() => []),
        supabaseFetch("student_subscriptions", "select=student_id,status,lessons_left,ends_on").catch(() => []),
        supabaseFetch("groups", `select=id,name,teacher_id,branch_id&${orgFilter}`).catch(() => []),
        supabaseFetch("users", `select=*&${orgFilter}`).catch(() => [])
      ]);
      const subsByStudent = /* @__PURE__ */ new Map();
      subs.forEach((s) => {
        const arr = subsByStudent.get(s.student_id) || [];
        arr.push(s);
        subsByStudent.set(s.student_id, arr);
      });
      const studentName = new Map(students.map((s) => [s.id, s.name]));
      const groupById = new Map(groups.map((g2) => [g2.id, g2]));
      const userName = new Map(
        users.map((u) => [u.id, u.full_name || u.name || [u.first_name, u.last_name].filter(Boolean).join(" ") || "\u041F\u0435\u0434\u0430\u0433\u043E\u0433"])
      );
      const groupStudentCount = /* @__PURE__ */ new Map();
      students.forEach((s) => {
        if (!s.group_id) return;
        groupStudentCount.set(s.group_id, (groupStudentCount.get(s.group_id) || 0) + 1);
      });
      const visited = /* @__PURE__ */ new Set();
      const trialStudents = /* @__PURE__ */ new Set();
      const trialConverted = /* @__PURE__ */ new Set();
      const markedByLesson = /* @__PURE__ */ new Map();
      attendance.forEach((a) => {
        const marked = a.status && a.status !== "unknown";
        if (marked) markedByLesson.set(a.lesson_id, (markedByLesson.get(a.lesson_id) || 0) + 1);
        if (a.status === "present" || a.status === "excused" || a.is_trial) visited.add(a.student_id);
        if (a.is_trial || a.status === "trial") {
          trialStudents.add(a.student_id);
          if (a.trial_outcome === "converted") trialConverted.add(a.student_id);
        }
      });
      const presentStudents = /* @__PURE__ */ new Set();
      attendance.forEach((a) => {
        if (a.status === "present") presentStudents.add(a.student_id);
      });
      const unpaid = [];
      presentStudents.forEach((sid) => {
        if (trialStudents.has(sid)) return;
        if (!hasActiveSubscription(subsByStudent.get(sid) || [], today)) unpaid.push(sid);
      });
      const trialBought = [];
      const trialNotBought = [];
      trialStudents.forEach((sid) => {
        const bought = trialConverted.has(sid) || hasActiveSubscription(subsByStudent.get(sid) || [], today);
        (bought ? trialBought : trialNotBought).push(sid);
      });
      const now = Date.now();
      const openJournals = lessons.filter((l) => {
        const ended = new Date(l.ends_at).getTime();
        return ended + 60 * 60 * 1e3 < now;
      }).map((l) => {
        const total = groupStudentCount.get(l.group_id) || 0;
        const marked = markedByLesson.get(l.id) || 0;
        const unmarkedCount = Math.max(0, total - marked);
        const g2 = groupById.get(l.group_id);
        const fmt = (iso) => new Date(iso).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
        return {
          lessonId: l.id,
          groupId: l.group_id,
          groupName: g2?.name || "\u0413\u0440\u0443\u043F\u043F\u0430",
          teacherId: l.teacher_id || g2?.teacher_id || null,
          teacherName: userName.get(l.teacher_id || g2?.teacher_id) || "\u041F\u0435\u0434\u0430\u0433\u043E\u0433",
          branchId: l.branch_id || null,
          startsAt: l.starts_at,
          endsAt: l.ends_at,
          timeLabel: `${fmt(l.starts_at)} \u2013 ${fmt(l.ends_at)}`,
          unmarkedCount,
          minutesOverdue: Math.floor((now - new Date(l.ends_at).getTime()) / 6e4)
        };
      }).filter((x) => x.unmarkedCount > 0);
      res.json({
        rangeFrom: from,
        rangeTo: to,
        visited: { count: visited.size, studentIds: [...visited] },
        unpaid: { count: unpaid.length, studentIds: unpaid },
        trialNotBought: { count: trialNotBought.length, studentIds: trialNotBought },
        trialBought: { count: trialBought.length, studentIds: trialBought },
        openJournals,
        _names: Object.fromEntries(studentName)
      });
    } catch (error) {
      res.json(emptyJournalDashboard(from, to));
    }
  }));
  app2.get("/api/mvp/recalculations", ah(async (req, res) => {
    const session = getSession(req);
    if (!supabaseEnabled) return res.json({ recalculations: [] });
    const q = req.query;
    const filters = [`select=*`, `organization_id=eq.${session.organizationId}`, "order=created_at.desc"];
    if (q.studentId) filters.push(`student_id=eq.${q.studentId}`);
    if (q.status) filters.push(`status=eq.${q.status}`);
    if (session.role !== "owner" && session.dbBranchId) filters.push(`branch_id=eq.${session.dbBranchId}`);
    try {
      const rows = await supabaseFetch("recalculations", filters.join("&"));
      res.json({ recalculations: rows.map((r) => mapDbRecalc(r)) });
    } catch (error) {
      res.json({ recalculations: [] });
    }
  }));
  app2.post("/api/mvp/recalculations", ah(async (req, res) => {
    const session = getSession(req);
    const p = req.body || {};
    if (!p.studentId) return res.status(400).json({ error: "studentId is required" });
    if (!supabaseEnabled) return res.status(503).json({ error: "Supabase is not configured" });
    try {
      const studs = await supabaseFetch("students", `select=branch_id&id=eq.${p.studentId}&limit=1`);
      const branch = studs[0]?.branch_id || session.dbBranchId || null;
      if (!canSeeBranch(session, branch)) return res.status(403).json({ error: "Branch access denied" });
      const inserted = await supabaseFetch("recalculations", "", {
        method: "POST",
        body: JSON.stringify({
          organization_id: session.organizationId,
          branch_id: branch,
          student_id: p.studentId,
          subscription_id: p.subscriptionId || null,
          period_from: p.periodFrom || null,
          period_to: p.periodTo || null,
          lessons_count: Number(p.lessonsCount) || 0,
          reason: p.reason || null,
          amount: Number(p.amount) || 0,
          comment: p.comment || null,
          attachment_url: p.attachmentUrl || null,
          attachment_name: p.attachmentName || null,
          status: "pending",
          created_by: authorId(session),
          created_by_name: session.fullName || null
        })
      });
      res.status(201).json({ recalculation: mapDbRecalc(inserted[0]) });
    } catch (error) {
      res.status(400).json({ error: error.message || "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0441\u043E\u0437\u0434\u0430\u0442\u044C \u043F\u0435\u0440\u0435\u0440\u0430\u0441\u0447\u0451\u0442. \u041F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435, \u043F\u0440\u0438\u043C\u0435\u043D\u0435\u043D\u0430 \u043B\u0438 \u043C\u0438\u0433\u0440\u0430\u0446\u0438\u044F 016." });
    }
  }));
  app2.patch("/api/mvp/recalculations/:id", ah(async (req, res) => {
    const session = getSession(req);
    if (!supabaseEnabled) return res.status(503).json({ error: "Supabase is not configured" });
    const p = req.body || {};
    const patch = {};
    if (p.status && ["pending", "applied", "cancelled"].includes(p.status)) {
      patch.status = p.status;
      if (p.status === "applied") patch.applied_at = (/* @__PURE__ */ new Date()).toISOString();
    }
    if (p.amount !== void 0) patch.amount = Number(p.amount) || 0;
    if (p.lessonsCount !== void 0) patch.lessons_count = Number(p.lessonsCount) || 0;
    if (p.comment !== void 0) patch.comment = p.comment;
    if (p.appliedPaymentId !== void 0) patch.applied_payment_id = p.appliedPaymentId;
    if (Object.keys(patch).length === 0) return res.status(400).json({ error: "\u041D\u0435\u0442 \u043F\u043E\u043B\u0435\u0439 \u0434\u043B\u044F \u043E\u0431\u043D\u043E\u0432\u043B\u0435\u043D\u0438\u044F" });
    try {
      const rows = await supabaseFetch(
        "recalculations",
        `id=eq.${req.params.id}&organization_id=eq.${session.organizationId}`,
        { method: "PATCH", body: JSON.stringify(patch) }
      );
      res.json({ recalculation: rows[0] ? mapDbRecalc(rows[0]) : null });
    } catch (error) {
      res.status(400).json({ error: error.message || "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043E\u0431\u043D\u043E\u0432\u0438\u0442\u044C \u043F\u0435\u0440\u0435\u0440\u0430\u0441\u0447\u0451\u0442" });
    }
  }));
  app2.post("/api/mvp/students/:id/pay-later", ah(async (req, res) => {
    const session = getSession(req);
    if (!supabaseEnabled) return res.status(503).json({ error: "Supabase is not configured" });
    const enabled = req.body?.enabled !== false;
    try {
      const studs = await supabaseFetch("students", `select=branch_id&id=eq.${req.params.id}&limit=1`);
      if (!studs[0]) return res.status(404).json({ error: "Student not found" });
      if (!canSeeBranch(session, studs[0].branch_id)) return res.status(403).json({ error: "Branch access denied" });
      const rows = await supabaseFetch(`students`, `id=eq.${req.params.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          pay_later: enabled,
          pay_later_set_at: enabled ? (/* @__PURE__ */ new Date()).toISOString() : null
        })
      });
      res.json({ ok: true, student: rows[0] || null });
    } catch (error) {
      res.status(400).json({ error: error.message || "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043E\u0431\u043D\u043E\u0432\u0438\u0442\u044C \u0441\u0442\u0430\u0442\u0443\u0441. \u041F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u043C\u0438\u0433\u0440\u0430\u0446\u0438\u044E 016." });
    }
  }));
  const DOC_STATUSES = ["draft", "active", "expired", "terminated"];
  const REMIND_DAYS = 30;
  const orgName = "\u042D\u0445\u043E \u0413\u043E\u0440";
  const mockDocuments = [
    { id: uid(), organization_id: orgId2, category: "\u0410\u0440\u0435\u043D\u0434\u0430", contractor: "\u0422\u041E\u041E \xAB\u0410\u043B\u043C\u0430\u0442\u044B \u041C\u043E\u043B\u043B\xBB", subject: "\u0417\u0430\u043B 120 \u043C\xB2, 3 \u044D\u0442\u0430\u0436", amount: 45e4, currency: "\u20B8", date_start: "2026-01-01", date_end: "2026-07-15", auto_renew: false, status: "active", scan_url: null, comment: "", created_at: "2026-01-01T00:00:00Z" },
    { id: uid(), organization_id: orgId2, category: "\u0423\u0441\u043B\u0443\u0433\u0438 \u2014 \u0443\u0431\u043E\u0440\u043A\u0430", contractor: "\u0418\u041F \u041A\u043B\u0438\u043D\u0438\u043D\u0433 \u0421\u0435\u0440\u0432\u0438\u0441", subject: "\u0415\u0436\u0435\u0434\u043D\u0435\u0432\u043D\u0430\u044F \u0443\u0431\u043E\u0440\u043A\u0430 \u0437\u0430\u043B\u043E\u0432", amount: 9e4, currency: "\u20B8", date_start: "2026-03-01", date_end: "2027-03-01", auto_renew: true, status: "active", scan_url: null, comment: "", created_at: "2026-03-01T00:00:00Z" },
    { id: uid(), organization_id: orgId2, category: "\u0423\u0441\u043B\u0443\u0433\u0438 \u2014 \u0432\u044B\u0432\u043E\u0437 \u043C\u0443\u0441\u043E\u0440\u0430", contractor: "\u0422\u0430\u0437\u0430\u043B\u044B\u043A", subject: "\u0412\u044B\u0432\u043E\u0437 \u0422\u0411\u041E 2 \u0440\u0430\u0437\u0430/\u043D\u0435\u0434", amount: 25e3, currency: "\u20B8", date_start: "2025-09-01", date_end: "2026-06-30", auto_renew: false, status: "active", scan_url: null, comment: "", created_at: "2025-09-01T00:00:00Z" }
  ];
  const mockTemplates = [
    {
      id: uid(),
      organization_id: orgId2,
      name: "\u0414\u043E\u0433\u043E\u0432\u043E\u0440 \u0430\u0440\u0435\u043D\u0434\u044B \u043F\u043E\u043C\u0435\u0449\u0435\u043D\u0438\u044F",
      category: "\u0410\u0440\u0435\u043D\u0434\u0430",
      sort_order: 0,
      body: '<h2 style="text-align:center">\u0414\u041E\u0413\u041E\u0412\u041E\u0420 \u0410\u0420\u0415\u041D\u0414\u042B \u041F\u041E\u041C\u0415\u0429\u0415\u041D\u0418\u042F</h2><p style="text-align:right">\u0433. {{city}}, {{today}}</p><p>{{org_name}}, \u0438\u043C\u0435\u043D\u0443\u0435\u043C\u043E\u0435 \xAB\u0410\u0440\u0435\u043D\u0434\u0430\u0442\u043E\u0440\xBB, \u0438 {{contractor}}, \u0438\u043C\u0435\u043D\u0443\u0435\u043C\u044B\u0439 \xAB\u0410\u0440\u0435\u043D\u0434\u043E\u0434\u0430\u0442\u0435\u043B\u044C\xBB, \u0437\u0430\u043A\u043B\u044E\u0447\u0438\u043B\u0438 \u043D\u0430\u0441\u0442\u043E\u044F\u0449\u0438\u0439 \u0434\u043E\u0433\u043E\u0432\u043E\u0440.</p><p><b>1. \u041F\u0440\u0435\u0434\u043C\u0435\u0442.</b> \u0410\u0440\u0435\u043D\u0434\u043E\u0434\u0430\u0442\u0435\u043B\u044C \u043F\u0435\u0440\u0435\u0434\u0430\u0451\u0442 \u0432\u043E \u0432\u0440\u0435\u043C\u0435\u043D\u043D\u043E\u0435 \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u043D\u0438\u0435 \u043F\u043E\u043C\u0435\u0449\u0435\u043D\u0438\u0435: {{subject}}.</p><p><b>2. \u0421\u0440\u043E\u043A.</b> \u0414\u043E\u0433\u043E\u0432\u043E\u0440 \u0434\u0435\u0439\u0441\u0442\u0432\u0443\u0435\u0442 \u0441 {{date_start}} \u043F\u043E {{date_end}}.[[if auto_renew]] \u041F\u043E \u043E\u043A\u043E\u043D\u0447\u0430\u043D\u0438\u0438 \u0441\u0440\u043E\u043A \u043F\u0440\u043E\u0434\u043B\u0435\u0432\u0430\u0435\u0442\u0441\u044F \u0430\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u0435\u0441\u043A\u0438 \u043D\u0430 \u0442\u043E\u0442 \u0436\u0435 \u043F\u0435\u0440\u0438\u043E\u0434, \u0435\u0441\u043B\u0438 \u043D\u0438 \u043E\u0434\u043D\u0430 \u0438\u0437 \u0441\u0442\u043E\u0440\u043E\u043D \u043D\u0435 \u0437\u0430\u044F\u0432\u0438\u0442 \u043E\u0431 \u043E\u0442\u043A\u0430\u0437\u0435 \u0437\u0430 30 \u0434\u043D\u0435\u0439.[[/if]]</p><p><b>3. \u0410\u0440\u0435\u043D\u0434\u043D\u0430\u044F \u043F\u043B\u0430\u0442\u0430.</b> {{amount}} {{currency}} \u0432 \u043C\u0435\u0441\u044F\u0446.[[if vat]] \u0412 \u0442\u043E\u043C \u0447\u0438\u0441\u043B\u0435 \u041D\u0414\u0421.[[/if]][[if !vat]] \u041D\u0414\u0421 \u043D\u0435 \u043E\u0431\u043B\u0430\u0433\u0430\u0435\u0442\u0441\u044F.[[/if]] [[if prepay]]\u041E\u043F\u043B\u0430\u0442\u0430 \u0430\u0432\u0430\u043D\u0441\u043E\u043C \u0434\u043E 5 \u0447\u0438\u0441\u043B\u0430 \u043C\u0435\u0441\u044F\u0446\u0430.[[/if]][[if !prepay]]\u041E\u043F\u043B\u0430\u0442\u0430 \u043F\u043E \u0444\u0430\u043A\u0442\u0443 \u0434\u043E 10 \u0447\u0438\u0441\u043B\u0430 \u0441\u043B\u0435\u0434\u0443\u044E\u0449\u0435\u0433\u043E \u043C\u0435\u0441\u044F\u0446\u0430.[[/if]]</p><p><b>4. \u041F\u043E\u0434\u043F\u0438\u0441\u0438 \u0441\u0442\u043E\u0440\u043E\u043D.</b></p><p>\u0410\u0440\u0435\u043D\u0434\u0430\u0442\u043E\u0440: {{org_name}} ____________</p><p>\u0410\u0440\u0435\u043D\u0434\u043E\u0434\u0430\u0442\u0435\u043B\u044C: {{contractor}} ____________</p>',
      fields: [
        { key: "contractor", label: "\u0410\u0440\u0435\u043D\u0434\u043E\u0434\u0430\u0442\u0435\u043B\u044C (\u043A\u043E\u043D\u0442\u0440\u0430\u0433\u0435\u043D\u0442)", type: "text", required: true },
        { key: "subject", label: "\u041F\u043E\u043C\u0435\u0449\u0435\u043D\u0438\u0435 / \u0430\u0434\u0440\u0435\u0441", type: "text", required: true },
        { key: "amount", label: "\u0410\u0440\u0435\u043D\u0434\u043D\u0430\u044F \u043F\u043B\u0430\u0442\u0430 \u0432 \u043C\u0435\u0441\u044F\u0446", type: "number", required: true },
        { key: "date_start", label: "\u0414\u0430\u0442\u0430 \u043D\u0430\u0447\u0430\u043B\u0430", type: "date", required: true },
        { key: "date_end", label: "\u0414\u0430\u0442\u0430 \u043E\u043A\u043E\u043D\u0447\u0430\u043D\u0438\u044F", type: "date", required: false },
        { key: "city", label: "\u0413\u043E\u0440\u043E\u0434", type: "text", required: false }
      ],
      toggles: [
        { key: "vat", label: "\u0421 \u041D\u0414\u0421", default: false },
        { key: "prepay", label: "\u041F\u0440\u0435\u0434\u043E\u043F\u043B\u0430\u0442\u0430 (\u0430\u0432\u0430\u043D\u0441)", default: true },
        { key: "auto_renew", label: "\u0410\u0432\u0442\u043E\u043F\u0440\u043E\u043B\u043E\u043D\u0433\u0430\u0446\u0438\u044F", default: false }
      ]
    },
    {
      id: uid(),
      organization_id: orgId2,
      name: "\u0414\u043E\u0433\u043E\u0432\u043E\u0440 \u043E\u043A\u0430\u0437\u0430\u043D\u0438\u044F \u0443\u0441\u043B\u0443\u0433",
      category: "\u041F\u043E\u0434\u0440\u044F\u0434\u0447\u0438\u043A\u0438 / \u043F\u043E\u0441\u0442\u0430\u0432\u0449\u0438\u043A\u0438",
      sort_order: 1,
      body: '<h2 style="text-align:center">\u0414\u041E\u0413\u041E\u0412\u041E\u0420 \u041E\u041A\u0410\u0417\u0410\u041D\u0418\u042F \u0423\u0421\u041B\u0423\u0413</h2><p style="text-align:right">\u0433. {{city}}, {{today}}</p><p>{{org_name}}, \u0438\u043C\u0435\u043D\u0443\u0435\u043C\u043E\u0435 \xAB\u0417\u0430\u043A\u0430\u0437\u0447\u0438\u043A\xBB, \u0438 {{contractor}}, \u0438\u043C\u0435\u043D\u0443\u0435\u043C\u044B\u0439 \xAB\u0418\u0441\u043F\u043E\u043B\u043D\u0438\u0442\u0435\u043B\u044C\xBB, \u0437\u0430\u043A\u043B\u044E\u0447\u0438\u043B\u0438 \u0434\u043E\u0433\u043E\u0432\u043E\u0440.</p><p><b>1. \u041F\u0440\u0435\u0434\u043C\u0435\u0442.</b> \u0418\u0441\u043F\u043E\u043B\u043D\u0438\u0442\u0435\u043B\u044C \u043E\u043A\u0430\u0437\u044B\u0432\u0430\u0435\u0442 \u0443\u0441\u043B\u0443\u0433\u0438: {{subject}}.</p><p><b>2. \u0421\u0440\u043E\u043A.</b> \u0421 {{date_start}} \u043F\u043E {{date_end}}.[[if auto_renew]] \u0414\u043E\u0433\u043E\u0432\u043E\u0440 \u043F\u0440\u043E\u0434\u043B\u0435\u0432\u0430\u0435\u0442\u0441\u044F \u0430\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u0435\u0441\u043A\u0438, \u0435\u0441\u043B\u0438 \u0441\u0442\u043E\u0440\u043E\u043D\u044B \u043D\u0435 \u0437\u0430\u044F\u0432\u044F\u0442 \u043E\u0431 \u043E\u0442\u043A\u0430\u0437\u0435 \u0437\u0430 30 \u0434\u043D\u0435\u0439.[[/if]]</p><p><b>3. \u0421\u0442\u043E\u0438\u043C\u043E\u0441\u0442\u044C.</b> {{amount}} {{currency}}.[[if vat]] \u0412 \u0442\u043E\u043C \u0447\u0438\u0441\u043B\u0435 \u041D\u0414\u0421.[[/if]][[if !vat]] \u041D\u0414\u0421 \u043D\u0435 \u043E\u0431\u043B\u0430\u0433\u0430\u0435\u0442\u0441\u044F.[[/if]] [[if prepay]]\u041F\u0440\u0435\u0434\u043E\u043F\u043B\u0430\u0442\u0430 100%.[[/if]][[if !prepay]]\u041E\u043F\u043B\u0430\u0442\u0430 \u043F\u043E \u0444\u0430\u043A\u0442\u0443.[[/if]][[if act]] \u041F\u0440\u0438\u0451\u043C\u043A\u0430 \u043E\u0444\u043E\u0440\u043C\u043B\u044F\u0435\u0442\u0441\u044F \u0430\u043A\u0442\u043E\u043C \u0432\u044B\u043F\u043E\u043B\u043D\u0435\u043D\u043D\u044B\u0445 \u0440\u0430\u0431\u043E\u0442.[[/if]]</p><p><b>4. \u041F\u043E\u0434\u043F\u0438\u0441\u0438.</b></p><p>\u0417\u0430\u043A\u0430\u0437\u0447\u0438\u043A: {{org_name}} ____________</p><p>\u0418\u0441\u043F\u043E\u043B\u043D\u0438\u0442\u0435\u043B\u044C: {{contractor}} ____________</p>',
      fields: [
        { key: "contractor", label: "\u0418\u0441\u043F\u043E\u043B\u043D\u0438\u0442\u0435\u043B\u044C (\u043A\u043E\u043D\u0442\u0440\u0430\u0433\u0435\u043D\u0442)", type: "text", required: true },
        { key: "subject", label: "\u041A\u0430\u043A\u0438\u0435 \u0443\u0441\u043B\u0443\u0433\u0438", type: "text", required: true },
        { key: "amount", label: "\u0421\u0442\u043E\u0438\u043C\u043E\u0441\u0442\u044C", type: "number", required: true },
        { key: "date_start", label: "\u0414\u0430\u0442\u0430 \u043D\u0430\u0447\u0430\u043B\u0430", type: "date", required: true },
        { key: "date_end", label: "\u0414\u0430\u0442\u0430 \u043E\u043A\u043E\u043D\u0447\u0430\u043D\u0438\u044F", type: "date", required: false },
        { key: "city", label: "\u0413\u043E\u0440\u043E\u0434", type: "text", required: false }
      ],
      toggles: [
        { key: "vat", label: "\u0421 \u041D\u0414\u0421", default: false },
        { key: "prepay", label: "\u041F\u0440\u0435\u0434\u043E\u043F\u043B\u0430\u0442\u0430", default: false },
        { key: "act", label: "\u0421 \u0430\u043A\u0442\u043E\u043C \u043F\u0440\u0438\u0451\u043C\u043A\u0438", default: true },
        { key: "auto_renew", label: "\u0410\u0432\u0442\u043E\u043F\u0440\u043E\u043B\u043E\u043D\u0433\u0430\u0446\u0438\u044F", default: false }
      ]
    }
  ];
  const docExpiry = (row) => {
    if (!row.date_end || row.status === "terminated") return { daysLeft: null, expiring: false, expired: false };
    const end = /* @__PURE__ */ new Date(row.date_end + "T00:00:00");
    const days = Math.ceil((end.getTime() - Date.now()) / 864e5);
    return { daysLeft: days, expiring: days >= 0 && days <= REMIND_DAYS, expired: days < 0 };
  };
  const docOut = (r) => ({
    id: r.id,
    category: r.category ?? null,
    contractor: r.contractor ?? null,
    subject: r.subject ?? null,
    amount: Number(r.amount) || 0,
    currency: r.currency ?? "\u20B8",
    dateStart: r.date_start ?? null,
    dateEnd: r.date_end ?? null,
    autoRenew: !!r.auto_renew,
    status: r.status ?? "draft",
    scanUrl: r.scan_url ?? null,
    templateId: r.template_id ?? null,
    comment: r.comment ?? null,
    createdAt: r.created_at ?? null,
    ...docExpiry(r)
  });
  const renderTemplate = (body, values, toggles) => {
    let out = String(body || "");
    out = out.replace(/\[\[if\s+(!?)([a-z_]+)\]\]([\s\S]*?)\[\[\/if\]\]/gi, (_m, neg, key, inner) => {
      const on = !!toggles[key];
      return (neg ? !on : on) ? inner : "";
    });
    out = out.replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (_m, key) => {
      const v = values[key];
      return v === void 0 || v === null || v === "" ? "\u2014" : String(v);
    });
    return out;
  };
  const requireOwner = (req, res) => {
    const session = getSession(req);
    if (session.role !== "owner") {
      res.status(403).json({ error: "\u0420\u0430\u0437\u0434\u0435\u043B \xAB\u0414\u043E\u043A\u0443\u043C\u0435\u043D\u0442\u043E\u043B\u043E\u0433\xBB \u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D \u0442\u043E\u043B\u044C\u043A\u043E \u0432\u043B\u0430\u0434\u0435\u043B\u044C\u0446\u0443" });
      return null;
    }
    return session;
  };
  app2.get("/api/mvp/documents", ah(async (req, res) => {
    const session = requireOwner(req, res);
    if (!session) return;
    const q = req.query;
    let rows;
    if (!supabaseEnabled) {
      rows = mockDocuments.filter((d) => d.organization_id === session.organizationId);
    } else {
      let query = `select=*&organization_id=eq.${session.organizationId}&order=created_at.desc`;
      if (q.category) query += `&category=eq.${encodeURIComponent(q.category)}`;
      if (q.status) query += `&status=eq.${encodeURIComponent(q.status)}`;
      rows = await supabaseFetch("documents", query);
    }
    let items = rows.map(docOut);
    if (!supabaseEnabled) {
      if (q.category) items = items.filter((d) => d.category === q.category);
      if (q.status) items = items.filter((d) => d.status === q.status);
    }
    const summary = {
      total: items.length,
      active: items.filter((d) => d.status === "active").length,
      expiring: items.filter((d) => d.expiring).length,
      expired: items.filter((d) => d.expired).length
    };
    res.json({ documents: items, summary, remindDays: REMIND_DAYS });
  }));
  app2.post("/api/mvp/documents", ah(async (req, res) => {
    const session = requireOwner(req, res);
    if (!session) return;
    const b = req.body || {};
    const rec = {
      organization_id: session.organizationId,
      category: b.category || null,
      contractor: (b.contractor || "").trim() || null,
      subject: (b.subject || "").trim() || null,
      amount: Number(b.amount) || 0,
      currency: b.currency || "\u20B8",
      date_start: b.dateStart || null,
      date_end: b.dateEnd || null,
      auto_renew: !!b.autoRenew,
      status: DOC_STATUSES.includes(b.status) ? b.status : "draft",
      scan_url: b.scanUrl || null,
      template_id: b.templateId || null,
      comment: b.comment || null
    };
    if (!supabaseEnabled) {
      const row = { id: uid(), created_at: (/* @__PURE__ */ new Date()).toISOString(), ...rec };
      mockDocuments.unshift(row);
      return res.status(201).json({ document: docOut(row) });
    }
    const inserted = await supabaseFetch("documents", "", { method: "POST", body: JSON.stringify(rec) });
    res.status(201).json({ document: docOut(inserted[0]) });
  }));
  app2.patch("/api/mvp/documents/:id", ah(async (req, res) => {
    const session = requireOwner(req, res);
    if (!session) return;
    const b = req.body || {};
    const map = { contractor: "contractor", subject: "subject", category: "category", currency: "currency", comment: "comment", dateStart: "date_start", dateEnd: "date_end", scanUrl: "scan_url" };
    const patch = {};
    for (const [k, col] of Object.entries(map)) if (b[k] !== void 0) patch[col] = b[k] === "" ? null : b[k];
    if (b.amount !== void 0) patch.amount = Number(b.amount) || 0;
    if (b.autoRenew !== void 0) patch.auto_renew = !!b.autoRenew;
    if (b.status !== void 0) {
      if (!DOC_STATUSES.includes(b.status)) return res.status(400).json({ error: "\u041D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u044B\u0439 \u0441\u0442\u0430\u0442\u0443\u0441" });
      patch.status = b.status;
    }
    patch.updated_at = (/* @__PURE__ */ new Date()).toISOString();
    if (!supabaseEnabled) {
      const row = mockDocuments.find((d) => d.id === req.params.id);
      if (!row) return res.status(404).json({ error: "\u0414\u043E\u0433\u043E\u0432\u043E\u0440 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D" });
      Object.assign(row, patch);
      return res.json({ document: docOut(row) });
    }
    const rows = await supabaseFetch("documents", `id=eq.${req.params.id}&organization_id=eq.${session.organizationId}`, { method: "PATCH", body: JSON.stringify(patch) });
    res.json({ document: rows[0] ? docOut(rows[0]) : null });
  }));
  app2.delete("/api/mvp/documents/:id", ah(async (req, res) => {
    const session = requireOwner(req, res);
    if (!session) return;
    if (!supabaseEnabled) {
      const i = mockDocuments.findIndex((d) => d.id === req.params.id);
      if (i >= 0) mockDocuments.splice(i, 1);
      return res.json({ ok: true });
    }
    await supabaseFetch("documents", `id=eq.${req.params.id}&organization_id=eq.${session.organizationId}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
    res.json({ ok: true });
  }));
  app2.get("/api/mvp/documents/templates", ah(async (req, res) => {
    const session = requireOwner(req, res);
    if (!session) return;
    let rows;
    if (!supabaseEnabled) {
      rows = mockTemplates.filter((t) => t.organization_id === session.organizationId);
    } else {
      rows = await supabaseFetch("document_templates", `select=*&organization_id=eq.${session.organizationId}&is_active=eq.true&order=sort_order.asc`);
    }
    res.json({ templates: rows.map((t) => ({ id: t.id, name: t.name, category: t.category ?? null, fields: t.fields || [], toggles: t.toggles || [] })) });
  }));
  app2.post("/api/mvp/documents/generate", ah(async (req, res) => {
    const session = requireOwner(req, res);
    if (!session) return;
    const b = req.body || {};
    const templateId = b.templateId;
    const values = b.values || {};
    const toggles = b.toggles || {};
    let tpl;
    if (!supabaseEnabled) {
      tpl = mockTemplates.find((t) => t.id === templateId);
    } else {
      const rows = await supabaseFetch("document_templates", `select=*&id=eq.${templateId}&organization_id=eq.${session.organizationId}&limit=1`);
      tpl = rows[0];
    }
    if (!tpl) return res.status(404).json({ error: "\u0428\u0430\u0431\u043B\u043E\u043D \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D" });
    const today = (/* @__PURE__ */ new Date()).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
    const ctx = { ...values, org_name: orgName, today, currency: values.currency || "\u20B8" };
    const inner = renderTemplate(tpl.body || "", ctx, toggles);
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${tpl.name}</title></head><body style="font-family:'Times New Roman',serif;font-size:14px;line-height:1.5;max-width:720px;margin:0 auto">${inner}</body></html>`;
    const rec = {
      organization_id: session.organizationId,
      category: tpl.category || null,
      contractor: (values.contractor || "").trim() || null,
      subject: (values.subject || "").trim() || null,
      amount: Number(values.amount) || 0,
      currency: ctx.currency,
      date_start: values.date_start || null,
      date_end: values.date_end || null,
      auto_renew: !!toggles.auto_renew,
      status: "draft",
      template_id: tpl.id
    };
    let document;
    if (!supabaseEnabled) {
      const row = { id: uid(), created_at: (/* @__PURE__ */ new Date()).toISOString(), scan_url: null, comment: null, ...rec };
      mockDocuments.unshift(row);
      document = docOut(row);
    } else {
      const inserted = await supabaseFetch("documents", "", { method: "POST", body: JSON.stringify(rec) });
      document = docOut(inserted[0]);
    }
    res.json({ html, filename: `${tpl.name}.doc`, document });
  }));
  const requireMeetingRole = (req, res) => {
    const session = getSession(req);
    if (session.role !== "owner" && session.role !== "branch_manager") {
      res.status(403).json({ error: "\u0420\u0430\u0437\u0434\u0435\u043B \xAB\u041F\u043B\u0430\u043D\u0451\u0440\u043A\u0438\xBB \u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D \u0432\u043B\u0430\u0434\u0435\u043B\u044C\u0446\u0443 \u0438 \u0443\u043F\u0440\u0430\u0432\u043B\u044F\u044E\u0449\u0435\u043C\u0443" });
      return null;
    }
    return session;
  };
  const mockMeetings = [];
  const mockMeetingItems = [];
  const meetingOut = (row, items = []) => ({
    id: row.id,
    branchId: row.branch_id ?? null,
    title: row.title,
    date: row.meeting_date,
    participants: Array.isArray(row.participants) ? row.participants : row.participants ? row.participants : [],
    agenda: row.agenda ?? null,
    summary: row.summary ?? null,
    transcript: row.transcript ?? null,
    status: row.status || "draft",
    createdBy: row.created_by ?? null,
    createdAt: row.created_at,
    items: items.map(itemOut),
    itemsCount: items.length,
    openItems: items.filter((i) => !i.done).length
  });
  const itemOut = (r) => ({ id: r.id, meetingId: r.meeting_id, title: r.title, assignee: r.assignee ?? null, dueDate: r.due_date ?? null, done: !!r.done, source: r.source || "manual", sort: r.sort ?? 0 });
  app2.get("/api/mvp/meetings", ah(async (req, res) => {
    const session = requireMeetingRole(req, res);
    if (!session) return;
    const q = String(req.query.q || "").trim().toLowerCase();
    let meetings;
    let items;
    if (!supabaseEnabled) {
      meetings = mockMeetings.filter((m) => m.organization_id === session.organizationId);
      items = mockMeetingItems.filter((i) => i.organization_id === session.organizationId);
    } else {
      meetings = await supabaseFetch("meetings", `select=*&organization_id=eq.${session.organizationId}&order=meeting_date.desc,created_at.desc`);
      items = await supabaseFetch("meeting_action_items", `select=*&organization_id=eq.${session.organizationId}`).catch(() => []);
    }
    if (session.role === "branch_manager" && session.dbBranchId) {
      meetings = meetings.filter((m) => !m.branch_id || m.branch_id === session.dbBranchId);
    }
    const itemsByMeeting = /* @__PURE__ */ new Map();
    for (const it of items) {
      const a = itemsByMeeting.get(it.meeting_id) || [];
      a.push(it);
      itemsByMeeting.set(it.meeting_id, a);
    }
    let out = meetings.map((m) => meetingOut(m, (itemsByMeeting.get(m.id) || []).sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0))));
    if (q) {
      out = out.filter(
        (m) => (m.title || "").toLowerCase().includes(q) || (m.summary || "").toLowerCase().includes(q) || (m.agenda || "").toLowerCase().includes(q) || (Array.isArray(m.participants) ? m.participants.join(" ") : "").toLowerCase().includes(q) || m.items.some((i) => (i.title || "").toLowerCase().includes(q) || (i.assignee || "").toLowerCase().includes(q))
      );
    }
    const summary = {
      total: out.length,
      openTasks: out.reduce((s, m) => s + m.openItems, 0),
      thisMonth: out.filter((m) => (m.date || "").slice(0, 7) === (/* @__PURE__ */ new Date()).toISOString().slice(0, 7)).length
    };
    res.json({ meetings: out, summary });
  }));
  app2.get("/api/mvp/meetings/:id", ah(async (req, res) => {
    const session = requireMeetingRole(req, res);
    if (!session) return;
    let row;
    let items;
    if (!supabaseEnabled) {
      row = mockMeetings.find((m) => m.id === req.params.id && m.organization_id === session.organizationId);
      items = mockMeetingItems.filter((i) => i.meeting_id === req.params.id);
    } else {
      const rows = await supabaseFetch("meetings", `select=*&id=eq.${req.params.id}&organization_id=eq.${session.organizationId}&limit=1`);
      row = rows[0];
      items = row ? await supabaseFetch("meeting_action_items", `select=*&meeting_id=eq.${req.params.id}&order=sort.asc`).catch(() => []) : [];
    }
    if (!row) return res.status(404).json({ error: "\u041F\u043B\u0430\u043D\u0451\u0440\u043A\u0430 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u0430" });
    res.json({ meeting: meetingOut(row, items.sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0))) });
  }));
  app2.post("/api/mvp/meetings", ah(async (req, res) => {
    const session = requireMeetingRole(req, res);
    if (!session) return;
    const b = req.body || {};
    if (!String(b.title || "").trim()) return res.status(400).json({ error: "\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 \u043F\u043B\u0430\u043D\u0451\u0440\u043A\u0438" });
    const participants = Array.isArray(b.participants) ? b.participants.filter((p) => String(p || "").trim()) : [];
    const rec = {
      organization_id: session.organizationId,
      branch_id: session.role === "branch_manager" ? session.dbBranchId || null : b.branchId || null,
      title: String(b.title).trim(),
      meeting_date: b.date || (/* @__PURE__ */ new Date()).toISOString().slice(0, 10),
      participants,
      agenda: (b.agenda || "").trim() || null,
      summary: (b.summary || "").trim() || null,
      transcript: (b.transcript || "").trim() || null,
      status: ["draft", "held", "archived"].includes(b.status) ? b.status : "draft",
      created_by: session.fullName || null
    };
    if (!supabaseEnabled) {
      const row = { id: uid(), created_at: (/* @__PURE__ */ new Date()).toISOString(), ...rec };
      mockMeetings.unshift(row);
      return res.status(201).json({ meeting: meetingOut(row, []) });
    }
    const inserted = await supabaseFetch("meetings", "", { method: "POST", body: JSON.stringify(rec) });
    res.status(201).json({ meeting: meetingOut(inserted[0], []) });
  }));
  app2.patch("/api/mvp/meetings/:id", ah(async (req, res) => {
    const session = requireMeetingRole(req, res);
    if (!session) return;
    const b = req.body || {};
    const patch = {};
    if (b.title !== void 0) patch.title = String(b.title).trim();
    if (b.date !== void 0) patch.meeting_date = b.date;
    if (b.participants !== void 0) patch.participants = Array.isArray(b.participants) ? b.participants.filter((p) => String(p || "").trim()) : [];
    if (b.agenda !== void 0) patch.agenda = (b.agenda || "").trim() || null;
    if (b.summary !== void 0) patch.summary = (b.summary || "").trim() || null;
    if (b.transcript !== void 0) patch.transcript = (b.transcript || "").trim() || null;
    if (b.status !== void 0) {
      if (!["draft", "held", "archived"].includes(b.status)) return res.status(400).json({ error: "\u041D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u044B\u0439 \u0441\u0442\u0430\u0442\u0443\u0441" });
      patch.status = b.status;
    }
    patch.updated_at = (/* @__PURE__ */ new Date()).toISOString();
    if (!supabaseEnabled) {
      const row = mockMeetings.find((m) => m.id === req.params.id && m.organization_id === session.organizationId);
      if (!row) return res.status(404).json({ error: "\u041F\u043B\u0430\u043D\u0451\u0440\u043A\u0430 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u0430" });
      Object.assign(row, patch);
      const items2 = mockMeetingItems.filter((i) => i.meeting_id === row.id);
      return res.json({ meeting: meetingOut(row, items2) });
    }
    const rows = await supabaseFetch("meetings", `id=eq.${req.params.id}&organization_id=eq.${session.organizationId}`, { method: "PATCH", body: JSON.stringify(patch) });
    if (!rows[0]) return res.status(404).json({ error: "\u041F\u043B\u0430\u043D\u0451\u0440\u043A\u0430 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u0430" });
    const items = await supabaseFetch("meeting_action_items", `select=*&meeting_id=eq.${req.params.id}&order=sort.asc`).catch(() => []);
    res.json({ meeting: meetingOut(rows[0], items) });
  }));
  app2.delete("/api/mvp/meetings/:id", ah(async (req, res) => {
    const session = requireMeetingRole(req, res);
    if (!session) return;
    if (!supabaseEnabled) {
      const i = mockMeetings.findIndex((m) => m.id === req.params.id && m.organization_id === session.organizationId);
      if (i >= 0) mockMeetings.splice(i, 1);
      for (let k = mockMeetingItems.length - 1; k >= 0; k--) if (mockMeetingItems[k].meeting_id === req.params.id) mockMeetingItems.splice(k, 1);
      return res.json({ ok: true });
    }
    await supabaseFetch("meetings", `id=eq.${req.params.id}&organization_id=eq.${session.organizationId}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
    res.json({ ok: true });
  }));
  app2.put("/api/mvp/meetings/:id/items", ah(async (req, res) => {
    const session = requireMeetingRole(req, res);
    if (!session) return;
    const list = Array.isArray(req.body?.items) ? req.body.items : [];
    const rows = list.map((it, idx) => ({
      title: String(it.title || "").trim(),
      assignee: (it.assignee || "").toString().trim() || null,
      due_date: it.dueDate || it.due_date || "" || null,
      done: !!it.done,
      source: it.source === "ai" ? "ai" : "manual",
      sort: idx
    })).filter((r) => r.title);
    if (!supabaseEnabled) {
      const m = mockMeetings.find((x) => x.id === req.params.id && x.organization_id === session.organizationId);
      if (!m) return res.status(404).json({ error: "\u041F\u043B\u0430\u043D\u0451\u0440\u043A\u0430 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u0430" });
      for (let k = mockMeetingItems.length - 1; k >= 0; k--) if (mockMeetingItems[k].meeting_id === req.params.id) mockMeetingItems.splice(k, 1);
      const created = rows.map((r) => ({ id: uid(), meeting_id: req.params.id, organization_id: session.organizationId, created_at: (/* @__PURE__ */ new Date()).toISOString(), ...r }));
      mockMeetingItems.push(...created);
      return res.json({ items: created.map(itemOut) });
    }
    const exists = await supabaseFetch("meetings", `select=id&id=eq.${req.params.id}&organization_id=eq.${session.organizationId}&limit=1`);
    if (!exists[0]) return res.status(404).json({ error: "\u041F\u043B\u0430\u043D\u0451\u0440\u043A\u0430 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u0430" });
    await supabaseFetch("meeting_action_items", `meeting_id=eq.${req.params.id}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
    if (rows.length === 0) return res.json({ items: [] });
    const payload = rows.map((r) => ({ meeting_id: req.params.id, organization_id: session.organizationId, ...r }));
    const inserted = await supabaseFetch("meeting_action_items", "", { method: "POST", body: JSON.stringify(payload) });
    res.json({ items: inserted.map(itemOut) });
  }));
  app2.patch("/api/mvp/meetings/:id/items/:itemId", ah(async (req, res) => {
    const session = requireMeetingRole(req, res);
    if (!session) return;
    const b = req.body || {};
    const patch = {};
    if (b.title !== void 0) patch.title = String(b.title).trim();
    if (b.assignee !== void 0) patch.assignee = (b.assignee || "").trim() || null;
    if (b.dueDate !== void 0) patch.due_date = b.dueDate || null;
    if (b.done !== void 0) patch.done = !!b.done;
    if (!supabaseEnabled) {
      const it = mockMeetingItems.find((i) => i.id === req.params.itemId && i.meeting_id === req.params.id);
      if (!it) return res.status(404).json({ error: "\u0417\u0430\u0434\u0430\u0447\u0430 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u0430" });
      Object.assign(it, patch);
      return res.json({ item: itemOut(it) });
    }
    const rows = await supabaseFetch("meeting_action_items", `id=eq.${req.params.itemId}&meeting_id=eq.${req.params.id}&organization_id=eq.${session.organizationId}`, { method: "PATCH", body: JSON.stringify(patch) });
    res.json({ item: rows[0] ? itemOut(rows[0]) : null });
  }));
  const planningStore = {};
  const planningMotivation = {};
  const planningDaily = {};
  const planningDefaults = (period) => ({
    period,
    branchId: null,
    source: "prev_month",
    revenueLines: [
      { direction: "\u0410\u043D\u0441\u0430\u043C\u0431\u043B\u044C", planned: 9e6, mode: "auto" },
      { direction: "\u0421\u043E\u043B\u043E", planned: 75e5, mode: "auto" },
      { direction: "\u0425\u0438\u043F-\u0445\u043E\u043F", planned: 6e6, mode: "auto" },
      { direction: "\u041C\u0430\u043B\u044B\u0448\u0438", planned: 4e6, mode: "auto" },
      { direction: "\u0412\u044B\u0441\u0442\u0443\u043F\u043B\u0435\u043D\u0438\u044F", planned: 25e5, mode: "manual" },
      { direction: "\u0422\u043E\u0432\u0430\u0440\u044B / \u0444\u043E\u0440\u043C\u0430", planned: 1e6, mode: "manual" }
    ],
    expenseLines: [
      { category: "\u0417\u0430\u0440\u043F\u043B\u0430\u0442\u0430", planned: 9e6, mode: "auto" },
      { category: "\u0410\u0440\u0435\u043D\u0434\u0430", planned: 4e6, mode: "manual" },
      { category: "\u0420\u0435\u043A\u043B\u0430\u043C\u0430", planned: 25e5, mode: "manual" },
      { category: "\u041A\u043E\u043C\u043C\u0443\u043D\u0430\u043B\u044C\u043D\u044B\u0435", planned: 8e5, mode: "manual" },
      { category: "\u041A\u043E\u0441\u0442\u044E\u043C\u044B", planned: 7e5, mode: "manual" },
      { category: "\u041C\u0430\u0442\u0435\u0440\u0438\u0430\u043B\u044B", planned: 6e5, mode: "manual" },
      { category: "\u041D\u0430\u043B\u043E\u0433\u0438", planned: 7e5, mode: "manual" },
      { category: "\u041F\u0440\u043E\u0447\u0435\u0435", planned: 3e5, mode: "manual" }
    ]
  });
  const motivationDefaults = () => [
    { level: "80% \u043F\u043B\u0430\u043D\u0430", threshold: 80, bonus: "+50 000 \u20B8 \u043A\u043E\u043C\u0430\u043D\u0434\u0435 \u0444\u0438\u043B\u0438\u0430\u043B\u0430" },
    { level: "100% \u043F\u043B\u0430\u043D\u0430", threshold: 100, bonus: "+150 000 \u20B8 + \u043F\u0440\u0435\u043C\u0438\u044F \u043F\u0435\u0434\u0430\u0433\u043E\u0433\u0430\u043C" },
    { level: "110% \u043F\u043B\u0430\u043D\u0430", threshold: 110, bonus: "+300 000 \u20B8 + \u043A\u043E\u043C\u0430\u043D\u0434\u043D\u0430\u044F \u043F\u043E\u0435\u0437\u0434\u043A\u0430" }
  ];
  const dailyDefaults = () => [
    { date: "2026-06-28", revenue: 54e4, trials: 4, sales: 3, comment: "\u0421\u0438\u043B\u044C\u043D\u044B\u0439 \u0434\u0435\u043D\u044C, \u0434\u043E\u0431\u043E\u0440 \u0432 \u0410\u043D\u0441\u0430\u043C\u0431\u043B\u044C", author: "\u041C\u0430\u0433\u043E\u043C\u0435\u0434 (\u0443\u043F\u0440\u0430\u0432\u043B\u044F\u044E\u0449\u0438\u0439)" },
    { date: "2026-06-27", revenue: 41e4, trials: 6, sales: 2, comment: "\u041C\u043D\u043E\u0433\u043E \u043F\u0440\u043E\u0431\u043D\u044B\u0445, \u043A\u043E\u043D\u0432\u0435\u0440\u0441\u0438\u044F \u043D\u0438\u0437\u043A\u0430\u044F", author: "\u041C\u0430\u0433\u043E\u043C\u0435\u0434 (\u0443\u043F\u0440\u0430\u0432\u043B\u044F\u044E\u0449\u0438\u0439)" },
    { date: "2026-06-26", revenue: 62e4, trials: 3, sales: 5, comment: "\u041F\u0440\u043E\u0434\u043B\u0438\u043B\u0438 5 \u0430\u0431\u043E\u043D\u0435\u043C\u0435\u043D\u0442\u043E\u0432", author: "\u0424\u0430\u0442\u0438\u043C\u0430 (\u0430\u0434\u043C\u0438\u043D)" }
  ];
  const planningFactByDirection = {
    "\u0410\u043D\u0441\u0430\u043C\u0431\u043B\u044C": 71e5,
    "\u0421\u043E\u043B\u043E": 59e5,
    "\u0425\u0438\u043F-\u0445\u043E\u043F": 46e5,
    "\u041C\u0430\u043B\u044B\u0448\u0438": 27e5,
    "\u0412\u044B\u0441\u0442\u0443\u043F\u043B\u0435\u043D\u0438\u044F": 1e6,
    "\u0422\u043E\u0432\u0430\u0440\u044B / \u0444\u043E\u0440\u043C\u0430": 6e5
  };
  const g = (name, teacher, check, perm, nw, free, factPrev, recommended, planned) => ({ name, teacher, check, permanent: perm, new: nw, total: perm + nw, free, factPrev, recommended, planned });
  const planDetailedMock = () => {
    const rooms = [
      { name: "\u0417\u0430\u043B \u21162", groupsCount: 4, studentsCount: 51, total: 991330, groups: [
        g("\u0410\u043D\u0441\u0430\u043C\u0431\u043B\u044C", "\u2014", 17176, 17, 0, 1, 292904, 282310, 291992),
        g("\u041C\u0443\u0436\u0441\u043A\u0430\u044F \u0432\u0437\u0440\u043E\u0441\u043B\u0430\u044F 17:00", "\u2014", 21900, 10, 0, 12, 209310, 309557, 219e3),
        g("\u041C\u0443\u0436\u0441\u043A\u0430\u044F \u0432\u0437\u0440\u043E\u0441\u043B\u0430\u044F 18:30", "\u2014", 20143, 7, 0, 15, 143220, 261188, 141001),
        g("\u041C\u043B\u0430\u0434\u0448\u0438\u0439 \u0430\u043D\u0441\u0430\u043C\u0431\u043B\u044C", "\u2014", 19961, 17, 0, 4, 351547, 359084, 339337)
      ] },
      { name: "\u0417\u0430\u043B \u21161", groupsCount: 17, studentsCount: 340, total: 6648051, groups: [
        g("\u041C\u0443\u0436\u0441\u043A\u0430\u044F \u0441\u0442\u0443\u0434\u0438\u044F \u0421\u0431 \u0412\u0441 (\u0425\u0430\u043C\u0438\u0442)", "\u0425\u0430\u043C\u0438\u0442", 18914, 28, 0, 0, 516272, 492261, 529592),
        g("\u041C\u0443\u0436\u0441\u043A\u0430\u044F \u043D\u0430\u0447\u0430\u043B\u044C\u043D\u044B\u0439 \u0412\u0442 \u0427\u0442 (\u0422\u0438\u043C\u0443\u0440)", "\u0422\u0438\u043C\u0443\u0440", 18338, 19, 1, 3, 347843, 370275, 366760),
        g("\u041F\u0440\u043E\u0434\u043E\u043B\u0436\u0430\u044E\u0449\u0430\u044F \u0433\u0440\u0443\u043F\u043F\u0430 \u0421\u0431 \u0412\u0441 (\u0422\u0438\u043C\u0443\u0440)", "\u0422\u0438\u043C\u0443\u0440", 20444, 27, 0, 0, 509733, 505424, 551988),
        g("\u0412\u0437\u0440\u043E\u0441\u043B\u0430\u044F \u043F\u0440\u043E\u0434\u043E\u043B\u0436\u0430\u044E\u0449\u0430\u044F \u0421\u0431 \u0412\u0441 (\u0414\u044D\u0439\u0441\u0438)", "\u0414\u044D\u0439\u0441\u0438", 19089, 15, 0, 5, 287619, 318897, 286335),
        g("\u0414\u0435\u0432\u0438\u0447\u044C\u044F \u0421\u0440 \u041F\u0442 (\u0414\u044D\u0439\u0441\u0438)", "\u0414\u044D\u0439\u0441\u0438", 19550, 12, 3, 0, 278193, 280223, 293250),
        g("\u0414\u0435\u0432\u0438\u0447\u044C\u044F 10:15 \u0441\u0431/\u0432\u0441 (\u0414\u044D\u0439\u0441\u0438)", "\u0414\u044D\u0439\u0441\u0438", 20130, 27, 0, 0, 557220, 518002, 543510),
        g("\u0412\u0437\u0440\u043E\u0441\u043B\u0430\u044F \u043D\u0430\u0447\u0430\u043B\u044C\u043D\u0430\u044F \u0421\u0431 \u0412\u0441 (\u041C\u0435\u0440\u0435\u0439)", "\u041C\u0435\u0440\u0435\u0439", 20174, 23, 0, 0, 475489, 464581, 464002),
        g("\u0412\u0437\u0440\u043E\u0441\u043B\u0430\u044F \u043F\u0440\u043E\u0434\u043E\u043B\u0436\u0430\u044E\u0449\u0430\u044F \u0421\u0431 \u0412\u0441 (\u041C\u0435\u0440\u0435\u0439)", "\u041C\u0435\u0440\u0435\u0439", 19684, 19, 0, 3, 360619, 372559, 373996),
        g("\u0414\u0435\u0432\u0438\u0447\u044C\u044F 10:00 (\u0410\u043D\u0436\u0435\u043B\u0430)", "\u0410\u043D\u0436\u0435\u043B\u0430", 18572, 22, 0, 3, 426740, 425060, 408584),
        g("\u0416\u0435\u043D\u0441\u043A\u0430\u044F \u043F\u0440\u043E\u0434\u043E\u043B\u0436\u0430\u044E\u0449\u0430\u044F \u0410\u043D\u0436\u0435\u043B\u0430", "\u2014", 19851, 37, 0, 0, 684583, 670438, 734487),
        g("\u0414\u0435\u0432\u0438\u0447\u044C\u044F 3-4 \u0433\u043E\u0434\u0430 (\u0410\u043D\u0436\u0435\u043B\u0430)", "\u0410\u043D\u0436\u0435\u043B\u0430", 20273, 11, 0, 11, 229731, 311612, 223003),
        g("\u0416\u0435\u043D\u0441\u043A\u0430\u044F \u0441\u0442\u0443\u0434\u0438\u044F \u0410\u043D\u0436\u0435\u043B\u0430", "\u2014", 18357, 14, 0, 3, 263404, 279937, 256998),
        g("\u0416\u0435\u043D\u0441\u043A\u0430\u044F \u0432\u0437\u0440\u043E\u0441\u043B\u0430\u044F \u0410\u043D\u0436\u0435\u043B\u0430 19:30", "\u2014", 18559, 16, 1, 5, 312256, 353559, 315503),
        g("\u0413\u0440\u0443\u0437\u0438\u043D\u0441\u043A\u0430\u044F \u0433\u0440\u0443\u043F\u043F\u0430", "\u2014", 19709, 11, 0, 0, 210123, 208831, 216799),
        g("\u0414\u0435\u0432\u0438\u0447\u044C\u044F \u043F\u0440\u043E\u0434\u043E\u043B\u0436\u0430\u044E\u0449\u0430\u044F \u0432\u0442/\u0447\u0442 (\u0410\u043D\u0436\u0435\u043B\u0430)", "\u0410\u043D\u0436\u0435\u043B\u0430", 19420, 22, 0, 0, 439126, 426047, 427240),
        g("\u041C\u0443\u0436\u0441\u043A\u0430\u044F 10:00 (\u0418\u0441\u043B\u0430\u043C)", "\u0418\u0441\u043B\u0430\u043C", 20700, 20, 0, 2, 427257, 429080, 414e3),
        g("\u041F\u0440\u043E\u0434\u043E\u043B\u0436\u0430\u044E\u0449\u0430\u044F (\u0418\u0441\u043B\u0430\u043C)", "\u0418\u0441\u043B\u0430\u043C", 20167, 12, 0, 0, 244809, 229663, 242004)
      ] },
      { name: "\u0417\u0430\u043B \u21163", groupsCount: 10, studentsCount: 55, total: 1364626, groups: [
        g("\u041C\u0438\u043D\u0438 \u0433\u0440\u0443\u043F\u043F\u0430 \u0432\u0437\u0440\u043E\u0441\u043B\u0430\u044F \u0421\u0440 \u041F\u0442 (\u041C\u0435\u0434\u0438\u043D\u0430)", "\u041C\u0435\u0434\u0438\u043D\u0430", 16375, 7, 4, 0, 171051, 168429, 180125),
        g("\u041C\u0438\u043D\u0438-\u0433\u0440\u0443\u043F\u043F\u0430 \u0432\u0437\u0440\u043E\u0441\u043B\u0430\u044F \u041F\u041D \u0421\u0440 (\u0425\u0430\u043C\u0438\u0442)", "\u0425\u0430\u043C\u0438\u0442", 20389, 6, 3, 1, 170724, 177248, 183501),
        g("\u0418\u043D\u0434\u0438\u0432\u0438\u0434\u0443\u0430\u043B\u044C\u043D\u044B\u0435 \u0425\u0430\u043C\u0438\u0442", "\u2014", 47e3, 6, 1, 0, 306999, 304661, 329e3),
        g("\u041C\u0438\u043D\u0438-\u0433\u0440\u0443\u043F\u043F\u0430 \u0434\u0435\u0442\u0441\u043A\u0430\u044F \u041F\u043D \u0421\u0440 (\u0425\u0430\u043C\u0438\u0442)", "\u0425\u0430\u043C\u0438\u0442", 18750, 8, 1, 0, 169195, 163157, 168750),
        g("\u041C\u0438\u043D\u0438 \u0433\u0440\u0443\u043F\u043F\u0430 \u0434\u0435\u0442\u0441\u043A\u0430\u044F \u0412\u0442 \u0427\u0442 (\u0422\u0438\u043C\u0443\u0440)", "\u0422\u0438\u043C\u0443\u0440", 24219, 4, 0, 2, 93787, 110315, 96876),
        g("\u041C\u0438\u043D\u0438-\u0433\u0440\u0443\u043F\u043F\u0430 \u0432\u0437\u0440\u043E\u0441\u043B\u0430\u044F \u0412\u0442 \u0427\u0442 (\u0414\u044D\u0439\u0441\u0438)", "\u0414\u044D\u0439\u0441\u0438", 22656, 8, 0, 0, 173038, 178152, 181248),
        g("\u0418\u043D\u0434\u0438\u0432\u0438\u0434\u0443\u0430\u043B\u044C\u043D\u044B\u0435 \u0414\u044D\u0439\u0441\u0438", "\u2014", 22500, 2, 0, 0, 45191, 44314, 45e3),
        g("\u0418\u043D\u0434\u0438\u0432\u0438\u0434\u0443\u0430\u043B\u044C\u043D\u044B\u0439 \u0422\u0438\u043C\u0443\u0440", "\u2014", 36750, 1, 0, 0, 34627, 35359, 36750),
        g("\u0418\u043D\u0434\u0438\u0432\u0438\u0434\u0443\u0430\u043B\u044C\u043D\u044B\u0435 \u041C\u0435\u0434\u0438\u043D\u0430", "\u2014", 44063, 1, 1, 0, 82947, 82590, 88126),
        g("\u0418\u043D\u0434\u0438\u0432\u0438\u0434\u0443\u0430\u043B\u044C\u043D\u044B\u0439 \u0418\u0441\u043B\u0430\u043C", "\u2014", 27625, 2, 0, 0, 52e3, 54e3, 55250)
      ] }
    ];
    const expenses = [
      { key: "rent", label: "\u0410\u0440\u0435\u043D\u0434\u0430", planned: 1080450, mode: "auto" },
      { key: "utilities", label: "\u041A\u043E\u043C. \u0443\u0441\u043B\u0443\u0433\u0438", planned: 55e3, mode: "auto" },
      { key: "salaries", label: "\u0417\u0430\u0440\u043F\u043B\u0430\u0442\u044B", planned: 2619025, mode: "auto", children: [
        { label: "\u041F\u0435\u0434\u0430\u0433\u043E\u0433 \xB7 \u0425\u0430\u043C\u0438\u0442", planned: 42e4 },
        { label: "\u041F\u0435\u0434\u0430\u0433\u043E\u0433 \xB7 \u0422\u0438\u043C\u0443\u0440", planned: 48e4 },
        { label: "\u041F\u0435\u0434\u0430\u0433\u043E\u0433 \xB7 \u0414\u044D\u0439\u0441\u0438", planned: 39e4 },
        { label: "\u0423\u043F\u0440\u0430\u0432\u043B\u044F\u044E\u0449\u0438\u0439 \xB7 \u0410\u043D\u0435\u043B\u044C", planned: 35e4 },
        { label: "\u0410\u0434\u043C\u0438\u043D\u0438\u0441\u0442\u0440\u0430\u0442\u043E\u0440", planned: 25e4 },
        { label: "\u041F\u0440\u043E\u0447\u0438\u0439 \u043F\u0435\u0440\u0441\u043E\u043D\u0430\u043B", planned: 729025 }
      ] },
      { key: "bonuses", label: "\u0411\u043E\u043D\u0443\u0441\u044B", planned: 333700, mode: "auto", children: [
        { label: "\u0411\u043E\u043D\u0443\u0441 \u0443\u043F\u0440\u0430\u0432\u043B\u044F\u044E\u0449\u0435\u0433\u043E", planned: 18e4 },
        { label: "\u0411\u043E\u043D\u0443\u0441\u044B \u043F\u0435\u0434\u0430\u0433\u043E\u0433\u043E\u0432", planned: 153700 }
      ] },
      { key: "household", label: "\u0425\u043E\u0437. \u0442\u043E\u0432\u0430\u0440\u044B", planned: 14e4, mode: "manual" },
      { key: "marketing", label: "\u041C\u0430\u0440\u043A\u0435\u0442\u0438\u043D\u0433", planned: 34e4, mode: "auto" },
      { key: "comms", label: "\u0421\u043E\u0442\u043E\u0432\u0430\u044F \u0441\u0432\u044F\u0437\u044C \u0438 \u043F\u043E\u0434\u043F\u0438\u0441\u043A\u0438", planned: 147230, mode: "manual" }
    ];
    return { rooms, expenses };
  };
  const buildDetailedPlan = async (session, period, _branchId) => {
    const mock = planDetailedMock();
    let rooms = mock.rooms;
    let expenses = mock.expenses;
    let branchName = "\u0410\u0441\u0442\u0430\u043D\u0430 203";
    const branches = [{ id: "astana203", name: "\u0410\u0441\u0442\u0430\u043D\u0430 203" }];
    if (supabaseEnabled) {
      try {
        const orgFilter = `organization_id=eq.${session.organizationId}`;
        const monthStart = `${period}-01`;
        const [branchesRaw, hallsRaw, groupsRaw, usersRaw, studentsRaw, subsRaw, compRaw] = await Promise.all([
          supabaseFetch("branches", `select=*&${orgFilter}&status=neq.archived`),
          supabaseFetch("halls", `select=*`).catch(() => []),
          supabaseFetch("groups", `select=*&${orgFilter}`).catch(() => []),
          supabaseFetch("users", `select=*&${orgFilter}`).catch(() => []),
          supabaseFetch("students", `select=*&${orgFilter}&status=eq.active`).catch(() => []),
          supabaseFetch("student_subscriptions", `select=*`).catch(() => []),
          supabaseFetch("teacher_compensation", `select=*&${orgFilter}`).catch(() => [])
        ]);
        if (Array.isArray(groupsRaw) && groupsRaw.length) {
          const branch = (branchesRaw || [])[0];
          if (branch) {
            branchName = branch.name;
            branches[0] = { id: branch.id, name: branch.name };
          }
          const teacherName = new Map((usersRaw || []).map((u) => [u.id, (u.full_name || "").split(" ")[0] || "\u2014"]));
          const hallName = new Map((hallsRaw || []).map((h) => [h.id, h.name]));
          const subsByGroup = /* @__PURE__ */ new Map();
          (subsRaw || []).forEach((s) => {
            if (s.status !== "active" || !s.group_id) return;
            const list = subsByGroup.get(s.group_id) || [];
            list.push(s);
            subsByGroup.set(s.group_id, list);
          });
          const studentsByGroup = /* @__PURE__ */ new Map();
          (studentsRaw || []).forEach((s) => {
            if (!s.group_id) return;
            const list = studentsByGroup.get(s.group_id) || [];
            list.push(s);
            studentsByGroup.set(s.group_id, list);
          });
          const roomMap = /* @__PURE__ */ new Map();
          for (const grp of groupsRaw) {
            const subs = subsByGroup.get(grp.id) || [];
            const students = studentsByGroup.get(grp.id) || [];
            const check = subs.length ? Math.round(subs.reduce((a, b) => a + Number(b.price || 0), 0) / subs.length) : 0;
            const total = students.length;
            const isNew = (s) => s.created_at && s.created_at >= monthStart;
            const nw = students.filter(isNew).length;
            const perm = Math.max(0, total - nw);
            const capacity = Number(grp.capacity || 0);
            const free = Math.max(0, capacity - total);
            const factPrev = subs.reduce((a, b) => a + Number(b.price || 0), 0);
            const planned = check * total;
            const recommended = Math.round(check * Math.max(total, Math.round(capacity * 0.9)));
            const row = { name: grp.name, teacher: teacherName.get(grp.teacher_id) || "\u2014", check, permanent: perm, new: nw, total, free, factPrev, recommended, planned };
            const rn = hallName.get(grp.hall_id) || "\u0411\u0435\u0437 \u0437\u0430\u043B\u0430";
            const room = roomMap.get(rn) || { name: rn, groupsCount: 0, studentsCount: 0, total: 0, groups: [] };
            room.groups.push(row);
            room.groupsCount++;
            room.studentsCount += total;
            room.total += planned;
            roomMap.set(rn, room);
          }
          if (roomMap.size) rooms = Array.from(roomMap.values());
          const salaryChildren = (compRaw || []).map((c) => ({ label: `\u041F\u0435\u0434\u0430\u0433\u043E\u0433 \xB7 ${teacherName.get(c.teacher_id) || "\u2014"}`, planned: Number(c.base_salary || 0) })).filter((x) => x.planned > 0);
          if (salaryChildren.length) {
            const salTotal = salaryChildren.reduce((a, b) => a + b.planned, 0);
            expenses = expenses.map((e) => e.key === "salaries" ? { ...e, planned: salTotal, children: salaryChildren } : e);
          }
        }
      } catch (e) {
        console.warn("[planning] detailed real-data compute failed, using mock:", e?.message || e);
      }
    }
    const allGroups = rooms.flatMap((r) => r.groups);
    const revenue = rooms.reduce((s, r) => s + r.total, 0);
    const studentsCount = rooms.reduce((s, r) => s + r.studentsCount, 0);
    const groupsCount = rooms.reduce((s, r) => s + r.groupsCount, 0);
    const capacityTotal = allGroups.reduce((s, r) => s + r.total + r.free, 0);
    const fillPct = capacityTotal ? Math.round(studentsCount / capacityTotal * 100) : 0;
    const expense = expenses.reduce((s, e) => s + e.planned, 0);
    const profit = revenue - expense;
    const margin = revenue ? Math.round(profit / revenue * 100) : 0;
    const isIndividual = (n) => /индивид/i.test(n);
    const isMini = (n) => /мини/i.test(n);
    const individual = allGroups.filter((x) => isIndividual(x.name)).reduce((s, x) => s + x.planned, 0);
    const mini = allGroups.filter((x) => !isIndividual(x.name) && isMini(x.name)).reduce((s, x) => s + x.planned, 0);
    const group = revenue - individual - mini;
    const newRevenue = allGroups.reduce((s, x) => s + x.check * x.new, 0);
    const permRevenue = revenue - newRevenue;
    const neededSales = 20;
    const trialConv = 0.5, recordConv = 0.7, leadConv = 0.55;
    const trials = Math.ceil(neededSales / trialConv);
    const records = Math.ceil(trials / recordConv);
    const leads = Math.ceil(records / leadConv);
    return {
      branchName,
      branches,
      groupsCount,
      studentsCount,
      fillPct,
      revenue,
      expense,
      profit,
      margin,
      byType: { group, mini, individual },
      byAudience: { permanent: permRevenue, new: newRevenue },
      rooms,
      expenses,
      funnel: { neededSales, trialConv, trials, recordConv, records, leadConv, leads }
    };
  };
  const buildPlanningOverview = (session, period, branchId) => {
    const key = `${session.organizationId}:${period}`;
    const budget = planningStore[key] || planningDefaults(period);
    const plannedRevenue = budget.revenueLines.reduce((s, r) => s + r.planned, 0);
    const plannedExpense = budget.expenseLines.reduce((s, e) => s + e.planned, 0);
    const plannedProfit = plannedRevenue - plannedExpense;
    const margin = plannedRevenue ? Math.round(plannedProfit / plannedRevenue * 1e3) / 10 : 0;
    const factRevenue = budget.revenueLines.reduce((s, r) => s + (planningFactByDirection[r.direction] ?? Math.round(r.planned * 0.73)), 0);
    const factExpense = Math.round(plannedExpense * 0.747);
    const factProfit = factRevenue - factExpense;
    const factMargin = factRevenue ? Math.round(factProfit / factRevenue * 1e3) / 10 : 0;
    const incomeByDirection = budget.revenueLines.map((r) => ({
      direction: r.direction,
      plan: r.planned,
      fact: planningFactByDirection[r.direction] ?? Math.round(r.planned * 0.73)
    }));
    const levels = [
      { level: "\u0413\u0440\u0443\u043F\u043F\u043E\u0432\u044B\u0435", plan: 8628449, fact: 8474882 },
      { level: "\u041C\u0438\u043D\u0438-\u0433\u0440\u0443\u043F\u043F\u044B", plan: 882486, fact: 810500 },
      { level: "\u0418\u043D\u0434\u0438\u0432\u0438\u0434\u0443\u0430\u043B\u044C\u043D\u044B\u0435", plan: 551500, fact: 554125 }
    ].map((l) => ({ ...l, deviation: l.fact - l.plan, done: Math.round(l.fact / l.plan * 100) }));
    const avgCheck = 24e3;
    const neededSales = Math.max(0, Math.ceil((plannedRevenue - factRevenue) / avgCheck));
    const funnel = {
      neededSales,
      trials: Math.ceil(neededSales / 0.4),
      // конверсия пробный→продажа 40%
      signups: Math.ceil(neededSales / 0.6),
      leads: Math.ceil(neededSales / 0.2)
      // лид→продажа 20%
    };
    return {
      period,
      branchId,
      mode: supabaseEnabled ? "db" : "mock",
      source: budget.source,
      basis: { prevMonth: 274e5, prevYear: 241e5, avg6: 26e6 },
      plan: {
        revenueLines: budget.revenueLines,
        expenseLines: budget.expenseLines,
        plannedRevenue,
        plannedExpense,
        plannedProfit,
        margin
      },
      fact: {
        revenue: factRevenue,
        expense: factExpense,
        profit: factProfit,
        margin: factMargin,
        donePct: plannedRevenue ? Math.round(factRevenue / plannedRevenue * 100) : 0,
        incomeByDirection
      },
      levels,
      funnel,
      motivation: planningMotivation[session.organizationId] || motivationDefaults(),
      daily: planningDaily[session.organizationId] || dailyDefaults()
    };
  };
  app2.get("/api/mvp/planning/overview", ah(async (req, res) => {
    const session = getSession(req);
    if (session.role !== "owner") return res.status(403).json({ error: "\u0420\u0430\u0437\u0434\u0435\u043B \xAB\u041F\u043B\u0430\u043D\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u0435\xBB \u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D \u0442\u043E\u043B\u044C\u043A\u043E \u0432\u043B\u0430\u0434\u0435\u043B\u044C\u0446\u0443" });
    const period = String(req.query.period || (/* @__PURE__ */ new Date()).toISOString().slice(0, 7));
    const branchId = req.query.branch && req.query.branch !== "all" ? String(req.query.branch) : null;
    const base = buildPlanningOverview(session, period, branchId);
    const detailed = await buildDetailedPlan(session, period, branchId);
    res.json({ ...base, detailed });
  }));
  app2.post("/api/mvp/planning/budget", ah(async (req, res) => {
    const session = getSession(req);
    if (session.role !== "owner") return res.status(403).json({ error: "\u0420\u0430\u0437\u0434\u0435\u043B \xAB\u041F\u043B\u0430\u043D\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u0435\xBB \u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D \u0442\u043E\u043B\u044C\u043A\u043E \u0432\u043B\u0430\u0434\u0435\u043B\u044C\u0446\u0443" });
    const b = req.body || {};
    const period = String(b.period || (/* @__PURE__ */ new Date()).toISOString().slice(0, 7));
    const key = `${session.organizationId}:${period}`;
    const base = planningStore[key] || planningDefaults(period);
    const store = {
      period,
      branchId: b.branchId || null,
      source: b.source || base.source,
      revenueLines: Array.isArray(b.revenueLines) ? b.revenueLines.map((r) => ({ direction: String(r.direction || "\u041D\u0430\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u0435"), planned: Number(r.planned) || 0, mode: r.mode === "manual" ? "manual" : "auto" })) : base.revenueLines,
      expenseLines: Array.isArray(b.expenseLines) ? b.expenseLines.map((e) => ({ category: String(e.category || "\u041A\u0430\u0442\u0435\u0433\u043E\u0440\u0438\u044F"), planned: Number(e.planned) || 0, mode: e.mode === "auto" ? "auto" : "manual" })) : base.expenseLines
    };
    planningStore[key] = store;
    if (supabaseEnabled) {
      try {
        await supabaseFetch("planning_budgets", "", {
          method: "POST",
          headers: { Prefer: "resolution=merge-duplicates" },
          body: JSON.stringify({
            organization_id: session.organizationId,
            branch_id: store.branchId,
            period_month: period,
            source: store.source,
            planned_revenue: store.revenueLines.reduce((s, r) => s + r.planned, 0),
            planned_expense: store.expenseLines.reduce((s, e) => s + e.planned, 0)
          })
        });
      } catch (e) {
      }
    }
    res.status(201).json(buildPlanningOverview(session, period, store.branchId));
  }));
  app2.patch("/api/mvp/planning/motivation", ah(async (req, res) => {
    const session = getSession(req);
    if (session.role !== "owner") return res.status(403).json({ error: "\u0420\u0430\u0437\u0434\u0435\u043B \xAB\u041F\u043B\u0430\u043D\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u0435\xBB \u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D \u0442\u043E\u043B\u044C\u043A\u043E \u0432\u043B\u0430\u0434\u0435\u043B\u044C\u0446\u0443" });
    const rows = Array.isArray(req.body?.motivation) ? req.body.motivation : [];
    planningMotivation[session.organizationId] = rows.map((r) => ({
      level: String(r.level || ""),
      threshold: Number(r.threshold) || 0,
      bonus: String(r.bonus || "")
    }));
    res.json({ motivation: planningMotivation[session.organizationId] });
  }));
  app2.post("/api/mvp/planning/daily", ah(async (req, res) => {
    const session = getSession(req);
    if (session.role !== "owner") return res.status(403).json({ error: "\u0420\u0430\u0437\u0434\u0435\u043B \xAB\u041F\u043B\u0430\u043D\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u0435\xBB \u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D \u0442\u043E\u043B\u044C\u043A\u043E \u0432\u043B\u0430\u0434\u0435\u043B\u044C\u0446\u0443" });
    const b = req.body || {};
    const row = {
      date: String(b.date || (/* @__PURE__ */ new Date()).toISOString().slice(0, 10)),
      revenue: Number(b.revenue) || 0,
      trials: Number(b.trials) || 0,
      sales: Number(b.sales) || 0,
      comment: String(b.comment || ""),
      author: String(b.author || "\u0423\u043F\u0440\u0430\u0432\u043B\u044F\u044E\u0449\u0438\u0439")
    };
    const list = planningDaily[session.organizationId] || dailyDefaults();
    planningDaily[session.organizationId] = [row, ...list];
    res.status(201).json({ daily: planningDaily[session.organizationId] });
  }));
  const penaltyStore = {};
  const penaltyDefaults = () => [
    { id: uid(), teacherId: null, teacherName: "\u0410\u0441\u043B\u0430\u043D \u041F\u043B\u0438\u0435\u0432", reason: "\u041E\u043F\u043E\u0437\u0434\u0430\u043D\u0438\u0435", amount: 5e3, period_month: "2026-06", created_by: "\u0423\u043F\u0440\u0430\u0432\u043B\u044F\u044E\u0449\u0438\u0439", comment: "\u041E\u043F\u043E\u0437\u0434\u0430\u043B \u043D\u0430 25 \u043C\u0438\u043D\u0443\u0442", created_at: "2026-06-18T09:00:00Z" },
    { id: uid(), teacherId: null, teacherName: "\u0425\u0430\u043C\u0438\u0442 \u041C\u0443\u0440\u0430\u0442\u043E\u0432\u0438\u0447", reason: "\u041D\u0435\u0437\u0430\u043A\u0440\u044B\u0442\u044B\u0439 \u0436\u0443\u0440\u043D\u0430\u043B", amount: 3e3, period_month: "2026-06", created_by: "\u0412\u043B\u0430\u0434\u0435\u043B\u0435\u0446", comment: "\u0416\u0443\u0440\u043D\u0430\u043B \u043D\u0435 \u0437\u0430\u043A\u0440\u044B\u0442 2 \u0434\u043D\u044F", created_at: "2026-06-22T19:00:00Z" }
  ];
  app2.get("/api/mvp/teachers/penalties", ah(async (req, res) => {
    const session = getSession(req);
    if (session.role !== "owner" && session.role !== "branch_manager") return res.status(403).json({ error: "\u0420\u0430\u0437\u0434\u0435\u043B \u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D \u0432\u043B\u0430\u0434\u0435\u043B\u044C\u0446\u0443 \u0438 \u0443\u043F\u0440\u0430\u0432\u043B\u044F\u044E\u0449\u0435\u043C\u0443" });
    if (!penaltyStore[session.organizationId]) penaltyStore[session.organizationId] = penaltyDefaults();
    let rows = penaltyStore[session.organizationId];
    if (supabaseEnabled) {
      try {
        rows = await supabaseFetch("teacher_penalties", `select=*&organization_id=eq.${session.organizationId}&order=created_at.desc`);
      } catch {
      }
    }
    const total = rows.reduce((s, r) => s + (Number(r.amount) || 0), 0);
    res.json({ penalties: rows, total });
  }));
  app2.post("/api/mvp/teachers/penalties", ah(async (req, res) => {
    const session = getSession(req);
    if (session.role !== "owner" && session.role !== "branch_manager") return res.status(403).json({ error: "\u0420\u0430\u0437\u0434\u0435\u043B \u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D \u0432\u043B\u0430\u0434\u0435\u043B\u044C\u0446\u0443 \u0438 \u0443\u043F\u0440\u0430\u0432\u043B\u044F\u044E\u0449\u0435\u043C\u0443" });
    const b = req.body || {};
    const amount = Number(b.amount);
    if (!b.reason || !amount || amount <= 0) return res.status(400).json({ error: "\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u043F\u0440\u0438\u0447\u0438\u043D\u0443 \u0438 \u0441\u0443\u043C\u043C\u0443 \u0448\u0442\u0440\u0430\u0444\u0430" });
    const row = {
      id: uid(),
      teacherId: b.teacherId || null,
      teacherName: b.teacherName || "\u041F\u0440\u0435\u043F\u043E\u0434\u0430\u0432\u0430\u0442\u0435\u043B\u044C",
      reason: String(b.reason),
      amount,
      period_month: String(b.period_month || (/* @__PURE__ */ new Date()).toISOString().slice(0, 7)),
      created_by: b.created_by === "\u0423\u043F\u0440\u0430\u0432\u043B\u044F\u044E\u0449\u0438\u0439" ? "\u0423\u043F\u0440\u0430\u0432\u043B\u044F\u044E\u0449\u0438\u0439" : "\u0412\u043B\u0430\u0434\u0435\u043B\u0435\u0446",
      comment: b.comment || null,
      created_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    if (supabaseEnabled) {
      try {
        await supabaseFetch("teacher_penalties", "", {
          method: "POST",
          body: JSON.stringify({
            organization_id: session.organizationId,
            teacher_id: row.teacherId,
            branch_id: b.branchId || session.dbBranchId || null,
            reason: row.reason,
            amount: row.amount,
            period_month: row.period_month,
            created_by: row.created_by,
            comment: row.comment
          })
        });
      } catch {
      }
    }
    if (!penaltyStore[session.organizationId]) penaltyStore[session.organizationId] = penaltyDefaults();
    penaltyStore[session.organizationId] = [row, ...penaltyStore[session.organizationId]];
    res.status(201).json({ penalty: row });
  }));
  app2.delete("/api/mvp/teachers/penalties/:id", ah(async (req, res) => {
    const session = getSession(req);
    if (session.role !== "owner" && session.role !== "branch_manager") return res.status(403).json({ error: "\u0420\u0430\u0437\u0434\u0435\u043B \u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D \u0432\u043B\u0430\u0434\u0435\u043B\u044C\u0446\u0443 \u0438 \u0443\u043F\u0440\u0430\u0432\u043B\u044F\u044E\u0449\u0435\u043C\u0443" });
    const id = req.params.id;
    if (supabaseEnabled) {
      try {
        await supabaseFetch("teacher_penalties", `id=eq.${id}&organization_id=eq.${session.organizationId}`, { method: "DELETE" });
      } catch {
      }
    }
    if (penaltyStore[session.organizationId]) penaltyStore[session.organizationId] = penaltyStore[session.organizationId].filter((r) => r.id !== id);
    res.json({ ok: true });
  }));
}

// server/geminiApi.ts
import { GoogleGenAI } from "@google/genai";
var apiKey = process.env.GEMINI_API_KEY;
var model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
var imageModel = process.env.GEMINI_IMAGE_MODEL || "gemini-2.0-flash-preview-image-generation";
var genai = apiKey ? new GoogleGenAI({ apiKey }) : null;
async function generateJson(prompt) {
  if (!genai) throw new Error("GEMINI_API_KEY is not configured");
  const response = await genai.models.generateContent({
    model,
    contents: prompt,
    config: { responseMimeType: "application/json", temperature: 0.7 }
  });
  const text = response.text ?? "";
  return JSON.parse(text);
}
function registerGeminiApi(app2) {
  app2.post("/api/gemini/insights", async (req, res) => {
    if (!genai) return res.status(503).json({ error: "GEMINI_API_KEY is not configured" });
    const { metrics, currentContext } = req.body || {};
    const prompt = `\u0422\u044B \u2014 \u0430\u043D\u0430\u043B\u0438\u0442\u0438\u043A \u0441\u0435\u0442\u0438 \u0448\u043A\u043E\u043B \u043A\u0430\u0432\u043A\u0430\u0437\u0441\u043A\u043E\u0433\u043E \u0442\u0430\u043D\u0446\u0430 \xAB\u042D\u0445\u043E \u0413\u043E\u0440\xBB. \u041F\u0440\u043E\u0430\u043D\u0430\u043B\u0438\u0437\u0438\u0440\u0443\u0439 \u043F\u043E\u043A\u0430\u0437\u0430\u0442\u0435\u043B\u0438 \u0438 \u0432\u0435\u0440\u043D\u0438 \u0421\u0422\u0420\u041E\u0413\u041E JSON \u043F\u043E \u0441\u0445\u0435\u043C\u0435:
{"executiveSummary": string, "branchRisks": [{"branchId": string, "riskTitle": string, "description": string, "severity": "low"|"medium"|"high"}], "growthRecommendations": string[], "insights": string[]}
\u041F\u0438\u0448\u0438 \u043F\u043E-\u0440\u0443\u0441\u0441\u043A\u0438, \u043A\u0440\u0430\u0442\u043A\u043E \u0438 \u043A\u043E\u043D\u043A\u0440\u0435\u0442\u043D\u043E, \u043E\u043F\u0438\u0440\u0430\u044F\u0441\u044C \u0442\u043E\u043B\u044C\u043A\u043E \u043D\u0430 \u043F\u0435\u0440\u0435\u0434\u0430\u043D\u043D\u044B\u0435 \u0434\u0430\u043D\u043D\u044B\u0435.
metrics=${JSON.stringify(metrics ?? {})}
context=${JSON.stringify(currentContext ?? {})}`;
    try {
      res.json(await generateJson(prompt));
    } catch (e) {
      res.status(502).json({ error: e?.message || "AI request failed" });
    }
  });
  app2.post("/api/gemini/student-analysis", async (req, res) => {
    if (!genai) return res.status(503).json({ error: "GEMINI_API_KEY is not configured" });
    const { student, notes } = req.body || {};
    const prompt = `\u0422\u044B \u2014 \u043E\u043F\u044B\u0442\u043D\u044B\u0439 \u043F\u0435\u0434\u0430\u0433\u043E\u0433 \u043A\u0430\u0432\u043A\u0430\u0437\u0441\u043A\u043E\u0433\u043E \u0442\u0430\u043D\u0446\u0430 \u0448\u043A\u043E\u043B\u044B \xAB\u042D\u0445\u043E \u0413\u043E\u0440\xBB. \u041F\u0440\u043E\u0430\u043D\u0430\u043B\u0438\u0437\u0438\u0440\u0443\u0439 \u043F\u0440\u043E\u0433\u0440\u0435\u0441\u0441 \u0443\u0447\u0435\u043D\u0438\u043A\u0430 \u0438 \u0432\u0435\u0440\u043D\u0438 \u0421\u0422\u0420\u041E\u0413\u041E JSON \u043F\u043E \u0441\u0445\u0435\u043C\u0435:
{"praise": string, "focusArea": string, "nextMilestoneAdvice": string}
\u041F\u0438\u0448\u0438 \u043F\u043E-\u0440\u0443\u0441\u0441\u043A\u0438, \u0434\u043E\u0431\u0440\u043E\u0436\u0435\u043B\u0430\u0442\u0435\u043B\u044C\u043D\u043E \u0438 \u043F\u043E \u0434\u0435\u043B\u0443.
student=${JSON.stringify(student ?? {})}
notes=${JSON.stringify(notes ?? [])}`;
    try {
      res.json(await generateJson(prompt));
    } catch (e) {
      res.status(502).json({ error: e?.message || "AI request failed" });
    }
  });
  app2.post("/api/gemini/lesson-plan", async (req, res) => {
    if (!genai) return res.status(503).json({ error: "GEMINI_API_KEY is not configured" });
    const { prompt: userPrompt, groupName, groupLevel, studentCount, context } = req.body || {};
    const prompt = `\u0422\u044B \u2014 \u043C\u0435\u0442\u043E\u0434\u0438\u0441\u0442 \u0438 \u0445\u043E\u0440\u0435\u043E\u0433\u0440\u0430\u0444 \u0448\u043A\u043E\u043B\u044B \u043A\u0430\u0432\u043A\u0430\u0437\u0441\u043A\u043E\u0433\u043E \u0442\u0430\u043D\u0446\u0430 \xAB\u042D\u0445\u043E \u0413\u043E\u0440\xBB. \u041F\u043E\u043C\u043E\u0433\u0438 \u043F\u0440\u0435\u043F\u043E\u0434\u0430\u0432\u0430\u0442\u0435\u043B\u044E \u0438 \u0432\u0435\u0440\u043D\u0438 \u0421\u0422\u0420\u041E\u0413\u041E JSON \u043F\u043E \u0441\u0445\u0435\u043C\u0435:
{"title": string, "summary": string, "sections": [{"heading": string, "items": string[]}]}
\u041F\u0438\u0448\u0438 \u043F\u043E-\u0440\u0443\u0441\u0441\u043A\u0438, \u043A\u043E\u043D\u043A\u0440\u0435\u0442\u043D\u043E \u0438 \u043F\u0440\u0438\u043C\u0435\u043D\u0438\u043C\u043E \u043D\u0430 \u0437\u0430\u043D\u044F\u0442\u0438\u0438. \u0415\u0441\u043B\u0438 \u044D\u0442\u043E \u043F\u043B\u0430\u043D \u0437\u0430\u043D\u044F\u0442\u0438\u044F \u2014 \u0440\u0430\u0437\u0434\u0435\u043B\u0438 \u043D\u0430 \u0440\u0430\u0437\u043C\u0438\u043D\u043A\u0443, \u043E\u0441\u043D\u043E\u0432\u043D\u0443\u044E \u0447\u0430\u0441\u0442\u044C, \u043E\u0442\u0440\u0430\u0431\u043E\u0442\u043A\u0443 \u0438 \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043D\u0438\u0435.
request=${JSON.stringify(userPrompt ?? "\u0421\u043E\u0441\u0442\u0430\u0432\u044C \u043F\u043B\u0430\u043D \u0437\u0430\u043D\u044F\u0442\u0438\u044F")}
group=${JSON.stringify({ groupName, groupLevel, studentCount })}
context=${JSON.stringify(context ?? {})}`;
    try {
      res.json(await generateJson(prompt));
    } catch (e) {
      res.status(502).json({ error: e?.message || "AI request failed" });
    }
  });
  app2.post("/api/gemini/competition-consult", async (req, res) => {
    if (!genai) return res.status(503).json({ error: "GEMINI_API_KEY is not configured" });
    const { competition, groupName, groupLevel, studentCount } = req.body || {};
    const prompt = `\u0422\u044B \u2014 \u0445\u043E\u0440\u0435\u043E\u0433\u0440\u0430\u0444-\u043F\u043E\u0441\u0442\u0430\u043D\u043E\u0432\u0449\u0438\u043A \u043A\u0430\u0432\u043A\u0430\u0437\u0441\u043A\u0438\u0445 \u0442\u0430\u043D\u0446\u0435\u0432 \u0448\u043A\u043E\u043B\u044B \xAB\u042D\u0445\u043E \u0413\u043E\u0440\xBB. \u0414\u0430\u0439 \u043A\u043E\u043D\u0441\u0443\u043B\u044C\u0442\u0430\u0446\u0438\u044E \u043F\u043E \u043F\u043E\u0434\u0433\u043E\u0442\u043E\u0432\u043A\u0435 \u0433\u0440\u0443\u043F\u043F\u044B \u043A \u043A\u043E\u043D\u043A\u0443\u0440\u0441\u0443 \u0438 \u0432\u0435\u0440\u043D\u0438 \u0421\u0422\u0420\u041E\u0413\u041E JSON \u043F\u043E \u0441\u0445\u0435\u043C\u0435:
{"readinessRating": string, "rehearsalPlan": string, "stageCraftAdvice": string}
\u041F\u0438\u0448\u0438 \u043F\u043E-\u0440\u0443\u0441\u0441\u043A\u0438. \u0412 rehearsalPlan \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439 \u043F\u0435\u0440\u0435\u043D\u043E\u0441\u044B \u0441\u0442\u0440\u043E\u043A \u0434\u043B\u044F \u043D\u0435\u0434\u0435\u043B\u044C.
competition=${JSON.stringify(competition ?? {})}
group=${JSON.stringify({ groupName, groupLevel, studentCount })}`;
    try {
      res.json(await generateJson(prompt));
    } catch (e) {
      res.status(502).json({ error: e?.message || "AI request failed" });
    }
  });
  app2.post("/api/gemini/parent-advice", async (req, res) => {
    if (!genai) return res.status(503).json({ error: "GEMINI_API_KEY is not configured" });
    const { question, childName, childAge, attendanceRate: attendanceRate2 } = req.body || {};
    const prompt = `\u0422\u044B \u2014 \u0434\u043E\u0431\u0440\u044B\u0439 \u0441\u0435\u043C\u0435\u0439\u043D\u044B\u0439 \u043D\u0430\u0441\u0442\u0430\u0432\u043D\u0438\u043A \u0448\u043A\u043E\u043B\u044B \u043A\u0430\u0432\u043A\u0430\u0437\u0441\u043A\u043E\u0433\u043E \u0442\u0430\u043D\u0446\u0430 \xAB\u042D\u0445\u043E \u0413\u043E\u0440\xBB. \u041F\u043E\u043C\u043E\u0433\u0430\u0435\u0448\u044C \u0440\u043E\u0434\u0438\u0442\u0435\u043B\u044E \u043F\u043E\u0434\u0434\u0435\u0440\u0436\u0430\u0442\u044C \u0440\u0435\u0431\u0451\u043D\u043A\u0430 \u0431\u0435\u0437 \u0434\u0430\u0432\u043B\u0435\u043D\u0438\u044F, \u043E\u043F\u0438\u0440\u0430\u044F\u0441\u044C \u043D\u0430 \u0446\u0435\u043D\u043D\u043E\u0441\u0442\u0438: \u0443\u0432\u0430\u0436\u0435\u043D\u0438\u0435 \u043A \u0441\u0442\u0430\u0440\u0448\u0438\u043C, \u0434\u0438\u0441\u0446\u0438\u043F\u043B\u0438\u043D\u0430, \u043E\u0442\u0432\u0435\u0442\u0441\u0442\u0432\u0435\u043D\u043D\u043E\u0441\u0442\u044C, \u0445\u0430\u0440\u0430\u043A\u0442\u0435\u0440. \u0412\u0435\u0440\u043D\u0438 \u0421\u0422\u0420\u041E\u0413\u041E JSON \u043F\u043E \u0441\u0445\u0435\u043C\u0435:
{"answer": string, "weekPlan": [{"day": string, "action": string}], "suggestedQuests": [{"title": string, "category": string, "reward": string}]}
\u041F\u0438\u0448\u0438 \u043F\u043E-\u0440\u0443\u0441\u0441\u043A\u0438, \u0442\u0435\u043F\u043B\u043E \u0438 \u043A\u043E\u043D\u043A\u0440\u0435\u0442\u043D\u043E. weekPlan \u2014 3-4 \u043F\u0443\u043D\u043A\u0442\u0430. suggestedQuests \u2014 2-3 \u043A\u0432\u0435\u0441\u0442\u0430, \u043A\u043E\u0442\u043E\u0440\u044B\u0435 \u0440\u043E\u0434\u0438\u0442\u0435\u043B\u044C \u043C\u043E\u0436\u0435\u0442 \u0434\u0430\u0442\u044C \u0440\u0435\u0431\u0451\u043D\u043A\u0443.
question=${JSON.stringify(question ?? "")}
child=${JSON.stringify({ childName, childAge, attendanceRate: attendanceRate2 })}`;
    try {
      res.json(await generateJson(prompt));
    } catch (e) {
      res.status(502).json({ error: e?.message || "AI request failed" });
    }
  });
  app2.post("/api/gemini/meeting-summary", async (req, res) => {
    if (!genai) return res.status(503).json({ error: "GEMINI_API_KEY is not configured" });
    const { transcript, title, participants, meetingDate } = req.body || {};
    if (!String(transcript || "").trim()) return res.status(400).json({ error: "\u041D\u0435\u0442 \u0442\u0435\u043A\u0441\u0442\u0430 \u0432\u0441\u0442\u0440\u0435\u0447\u0438 \u0434\u043B\u044F \u0430\u043D\u0430\u043B\u0438\u0437\u0430" });
    const today = meetingDate || (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
    const prompt = `\u0422\u044B \u2014 \u0430\u0441\u0441\u0438\u0441\u0442\u0435\u043D\u0442-\u0441\u0435\u043A\u0440\u0435\u0442\u0430\u0440\u044C \u043F\u043B\u0430\u043D\u0451\u0440\u043E\u043A \u0441\u0435\u0442\u0438 \u0448\u043A\u043E\u043B \u043A\u0430\u0432\u043A\u0430\u0437\u0441\u043A\u043E\u0433\u043E \u0442\u0430\u043D\u0446\u0430 \xAB\u042D\u0445\u043E \u0413\u043E\u0440\xBB. \u041D\u0430 \u0432\u0445\u043E\u0434 \u2014 \u0440\u0430\u0441\u0448\u0438\u0444\u0440\u043E\u0432\u043A\u0430 (\u0438\u043B\u0438 \u0437\u0430\u043C\u0435\u0442\u043A\u0438) \u0441\u043E\u0432\u0435\u0449\u0430\u043D\u0438\u044F. \u0421\u043E\u0441\u0442\u0430\u0432\u044C \u0434\u0435\u043B\u043E\u0432\u044B\u0435 \u0438\u0442\u043E\u0433\u0438 \u0438 \u0432\u044B\u0434\u0435\u043B\u0438 \u0437\u0430\u0434\u0430\u0447\u0438. \u0412\u0435\u0440\u043D\u0438 \u0421\u0422\u0420\u041E\u0413\u041E JSON \u043F\u043E \u0441\u0445\u0435\u043C\u0435:
{"summary": string, "decisions": string[], "actionItems": [{"title": string, "assignee": string, "dueDate": string}]}
\u041F\u0440\u0430\u0432\u0438\u043B\u0430: \u043F\u0438\u0448\u0438 \u043F\u043E-\u0440\u0443\u0441\u0441\u043A\u0438, \u043A\u0440\u0430\u0442\u043A\u043E \u0438 \u043F\u043E \u0434\u0435\u043B\u0443. summary \u2014 3-6 \u043F\u0440\u0435\u0434\u043B\u043E\u0436\u0435\u043D\u0438\u0439 \u0441\u0443\u0442\u0438 \u0432\u0441\u0442\u0440\u0435\u0447\u0438. decisions \u2014 \u043F\u0440\u0438\u043D\u044F\u0442\u044B\u0435 \u0440\u0435\u0448\u0435\u043D\u0438\u044F. actionItems \u2014 \u043A\u043E\u043D\u043A\u0440\u0435\u0442\u043D\u044B\u0435 \u0437\u0430\u0434\u0430\u0447\u0438; assignee \u2014 \u0438\u043C\u044F \u043E\u0442\u0432\u0435\u0442\u0441\u0442\u0432\u0435\u043D\u043D\u043E\u0433\u043E \u0438\u0437 \u0443\u0447\u0430\u0441\u0442\u043D\u0438\u043A\u043E\u0432 (\u0435\u0441\u043B\u0438 \u043D\u0435 \u043D\u0430\u0437\u0432\u0430\u043D \u2014 \u043F\u0443\u0441\u0442\u0430\u044F \u0441\u0442\u0440\u043E\u043A\u0430); dueDate \u2014 \u0434\u0430\u0442\u0430 \u0432 \u0444\u043E\u0440\u043C\u0430\u0442\u0435 YYYY-MM-DD (\u0435\u0441\u043B\u0438 \u0441\u0440\u043E\u043A \u043D\u0435 \u043D\u0430\u0437\u0432\u0430\u043D \u044F\u0432\u043D\u043E, \u043E\u0441\u0442\u0430\u0432\u044C \u043F\u0443\u0441\u0442\u0443\u044E \u0441\u0442\u0440\u043E\u043A\u0443, \u043D\u0435 \u0432\u044B\u0434\u0443\u043C\u044B\u0432\u0430\u0439). \u0414\u0430\u0442\u0430 \u043F\u043B\u0430\u043D\u0451\u0440\u043A\u0438: ${today}.
title=${JSON.stringify(title ?? "")}
participants=${JSON.stringify(participants ?? [])}
transcript=${JSON.stringify(String(transcript).slice(0, 24e3))}`;
    try {
      res.json(await generateJson(prompt));
    } catch (e) {
      res.status(502).json({ error: e?.message || "AI request failed" });
    }
  });
  app2.post("/api/gemini/reactivation", async (req, res) => {
    if (!genai) return res.status(503).json({ error: "GEMINI_API_KEY is not configured" });
    const { students } = req.body || {};
    const list = Array.isArray(students) ? students.slice(0, 40) : [];
    if (!list.length) return res.status(400).json({ error: "\u041D\u0435\u0442 \u043A\u0430\u043D\u0434\u0438\u0434\u0430\u0442\u043E\u0432 \u0434\u043B\u044F \u0430\u043D\u0430\u043B\u0438\u0437\u0430" });
    const prompt = `\u0422\u044B \u2014 \u043C\u0430\u0440\u043A\u0435\u0442\u043E\u043B\u043E\u0433 \u0441\u0435\u0442\u0438 \u0448\u043A\u043E\u043B \u043A\u0430\u0432\u043A\u0430\u0437\u0441\u043A\u043E\u0433\u043E \u0442\u0430\u043D\u0446\u0430 \xAB\u042D\u0445\u043E \u0413\u043E\u0440\xBB. \u0422\u0435\u0431\u0435 \u0434\u0430\u043D \u0441\u043F\u0438\u0441\u043E\u043A \u0423\u0428\u0415\u0414\u0428\u0418\u0425 \u0443\u0447\u0435\u043D\u0438\u043A\u043E\u0432: \u043F\u0440\u0438\u0447\u0438\u043D\u0430 \u0443\u0445\u043E\u0434\u0430, \u0441\u0432\u043E\u0431\u043E\u0434\u043D\u044B\u0439 \u043A\u043E\u043C\u043C\u0435\u043D\u0442\u0430\u0440\u0438\u0439 \u0438 \u0441\u043A\u043E\u043B\u044C\u043A\u043E \u043C\u0435\u0441\u044F\u0446\u0435\u0432 \u043F\u0440\u043E\u0448\u043B\u043E \u0441 \u0443\u0445\u043E\u0434\u0430. \u0414\u043B\u044F \u041A\u0410\u0416\u0414\u041E\u0413\u041E \u043F\u0440\u0435\u0434\u043B\u043E\u0436\u0438, \u0441\u0442\u043E\u0438\u0442 \u043B\u0438 \u0435\u0433\u043E \u0432\u043E\u0437\u0432\u0440\u0430\u0449\u0430\u0442\u044C \u0441\u0435\u0439\u0447\u0430\u0441 \u0438 \u043A\u0430\u043A\u0438\u043C \u043E\u0444\u0444\u0435\u0440\u043E\u043C, \u0441 \u0433\u043E\u0442\u043E\u0432\u044B\u043C \u043A\u043E\u0440\u043E\u0442\u043A\u0438\u043C \u0442\u0435\u043A\u0441\u0442\u043E\u043C \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u044F \u0440\u043E\u0434\u0438\u0442\u0435\u043B\u044E. \u0412\u0435\u0440\u043D\u0438 \u0421\u0422\u0420\u041E\u0413\u041E JSON \u043F\u043E \u0441\u0445\u0435\u043C\u0435:
{"candidates": [{"id": string, "recommend": boolean, "offerType": string, "message": string, "reasoning": string}]}
\u041F\u0440\u0430\u0432\u0438\u043B\u0430: \u043F\u0438\u0448\u0438 \u043F\u043E-\u0440\u0443\u0441\u0441\u043A\u0438, \u0442\u0435\u043F\u043B\u043E \u0438 \u043F\u043E-\u0447\u0435\u043B\u043E\u0432\u0435\u0447\u0435\u0441\u043A\u0438, \u0431\u0435\u0437 \u043D\u0430\u0432\u044F\u0437\u0447\u0438\u0432\u043E\u0441\u0442\u0438. offerType \u2014 \u043A\u043E\u0440\u043E\u0442\u043A\u043E\u0435 \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 \u043E\u0444\u0444\u0435\u0440\u0430 (\u043D\u0430\u043F\u0440\u0438\u043C\u0435\u0440: \xAB\u0411\u0435\u0441\u043F\u043B\u0430\u0442\u043D\u043E\u0435 \u043F\u0440\u043E\u0431\u043D\u043E\u0435 \u0432\u043E\u0437\u0432\u0440\u0430\u0449\u0435\u043D\u0438\u0435\xBB, \xAB\u0421\u043A\u0438\u0434\u043A\u0430 30% \u043D\u0430 \u043F\u0435\u0440\u0432\u044B\u0439 \u043C\u0435\u0441\u044F\u0446\xBB, \xAB\u0418\u043D\u0434\u0438\u0432\u0438\u0434\u0443\u0430\u043B\u044C\u043D\u044B\u0439 \u0433\u0440\u0430\u0444\u0438\u043A\xBB). message \u2014 \u0433\u043E\u0442\u043E\u0432\u044B\u0439 \u0442\u0435\u043A\u0441\u0442 \u0434\u043B\u044F \u0440\u043E\u0434\u0438\u0442\u0435\u043B\u044F (2-4 \u043F\u0440\u0435\u0434\u043B\u043E\u0436\u0435\u043D\u0438\u044F), \u0443\u0447\u0438\u0442\u044B\u0432\u0430\u0439 \u043F\u0440\u0438\u0447\u0438\u043D\u0443 \u0443\u0445\u043E\u0434\u0430. reasoning \u2014 1 \u043F\u0440\u0435\u0434\u043B\u043E\u0436\u0435\u043D\u0438\u0435, \u043F\u043E\u0447\u0435\u043C\u0443 \u0442\u0430\u043A\u043E\u0439 \u043E\u0444\u0444\u0435\u0440. recommend=false, \u0435\u0441\u043B\u0438 \u0432\u043E\u0437\u0432\u0440\u0430\u0449\u0430\u0442\u044C \u0441\u0435\u0439\u0447\u0430\u0441 \u043D\u0435 \u0441\u0442\u043E\u0438\u0442 (\u043D\u0430\u043F\u0440\u0438\u043C\u0435\u0440, \u0443\u0448\u043B\u0438 \u0438\u0437-\u0437\u0430 \u043F\u0435\u0440\u0435\u0435\u0437\u0434\u0430). id \u2014 \u0432\u0435\u0440\u043D\u0438 \u0440\u043E\u0432\u043D\u043E \u043A\u0430\u043A \u0432\u043E \u0432\u0445\u043E\u0434\u043D\u044B\u0445 \u0434\u0430\u043D\u043D\u044B\u0445.
students=${JSON.stringify(list)}`;
    try {
      res.json(await generateJson(prompt));
    } catch (e) {
      res.status(502).json({ error: e?.message || "AI request failed" });
    }
  });
  app2.post("/api/gemini/product-image", async (req, res) => {
    if (!genai) return res.status(503).json({ error: "GEMINI_API_KEY is not configured" });
    const { name, category, description } = req.body || {};
    if (!String(name || "").trim()) return res.status(400).json({ error: "\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 \u0442\u043E\u0432\u0430\u0440\u0430" });
    const prompt = `\u041F\u0440\u043E\u0444\u0435\u0441\u0441\u0438\u043E\u043D\u0430\u043B\u044C\u043D\u043E\u0435 \u0440\u0435\u043A\u043B\u0430\u043C\u043D\u043E\u0435 \u0444\u043E\u0442\u043E \u0442\u043E\u0432\u0430\u0440\u0430 \u0434\u043B\u044F \u0438\u043D\u0442\u0435\u0440\u043D\u0435\u0442-\u043C\u0430\u0433\u0430\u0437\u0438\u043D\u0430 \u0448\u043A\u043E\u043B\u044B \u043A\u0430\u0432\u043A\u0430\u0437\u0441\u043A\u043E\u0433\u043E \u0442\u0430\u043D\u0446\u0430 \xAB\u042D\u0445\u043E \u0413\u043E\u0440\xBB: ${name}${category ? `, \u043A\u0430\u0442\u0435\u0433\u043E\u0440\u0438\u044F: ${category}` : ""}${description ? `. ${description}` : ""}. \u0421\u0442\u0443\u0434\u0438\u0439\u043D\u044B\u0439 \u0441\u0432\u0435\u0442, \u0447\u0438\u0441\u0442\u044B\u0439 \u0441\u0432\u0435\u0442\u043B\u044B\u0439 \u0444\u043E\u043D, \u0442\u043E\u0432\u0430\u0440 \u043F\u043E \u0446\u0435\u043D\u0442\u0440\u0443, \u0432\u044B\u0441\u043E\u043A\u0430\u044F \u0434\u0435\u0442\u0430\u043B\u0438\u0437\u0430\u0446\u0438\u044F, \u044D\u0441\u0442\u0435\u0442\u0438\u0447\u043D\u043E, \u0431\u0435\u0437 \u0442\u0435\u043A\u0441\u0442\u0430, \u0432\u043E\u0434\u044F\u043D\u044B\u0445 \u0437\u043D\u0430\u043A\u043E\u0432 \u0438 \u043B\u043E\u0433\u043E\u0442\u0438\u043F\u043E\u0432.`;
    try {
      const response = await genai.models.generateContent({
        model: imageModel,
        contents: prompt,
        config: { responseModalities: ["IMAGE", "TEXT"] }
      });
      const parts = response?.candidates?.[0]?.content?.parts || [];
      const img = parts.find((p) => p?.inlineData?.data);
      if (!img?.inlineData?.data) return res.status(502).json({ error: "\u041C\u043E\u0434\u0435\u043B\u044C \u043D\u0435 \u0432\u0435\u0440\u043D\u0443\u043B\u0430 \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0435" });
      const mime = img.inlineData.mimeType || "image/png";
      res.json({ dataUrl: `data:${mime};base64,${img.inlineData.data}` });
    } catch (e) {
      res.status(502).json({ error: e?.message || "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0441\u0433\u0435\u043D\u0435\u0440\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0435" });
    }
  });
}

// server/magomedApi.ts
var ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
var ANTHROPIC_VERSION = "2023-06-01";
var apiKey2 = process.env.ANTHROPIC_API_KEY;
var model2 = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001";
var MAX_TOKENS = Number(process.env.ANTHROPIC_MAX_TOKENS) || 1024;
var supabaseUrl2 = process.env.SUPABASE_URL?.replace(/\/$/, "");
var supabaseKey2 = process.env.SUPABASE_SERVICE_ROLE_KEY;
var supabaseEnabled2 = Boolean(supabaseUrl2 && supabaseKey2);
var ORG_ID = "00000000-0000-0000-0000-000000000001";
var DEMO_BRANCH_ALMATY = "00000000-0000-0000-0000-000000000101";
var FULL_ACCESS_ROLES = ["owner", "branch_manager"];
function getSession2(req) {
  const raw = String(req.headers["x-demo-role"] || "owner");
  const role = raw === "branch_manager" || raw === "admin" || raw === "teacher" ? raw : "owner";
  return {
    role,
    organizationId: ORG_ID,
    dbBranchId: FULL_ACCESS_ROLES.includes(role) ? null : DEMO_BRANCH_ALMATY
  };
}
function isFullAccess(session) {
  return session.dbBranchId === null;
}
var MEMORY_DAYS = 7;
var MEMORY_MAX = 200;
function memorySinceIso() {
  return new Date(Date.now() - MEMORY_DAYS * 24 * 60 * 60 * 1e3).toISOString();
}
function threadKeyOf(req, session) {
  const raw = String(req.headers["x-magomed-thread"] || "").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64);
  return `${raw || "anon"}:${session.role}`;
}
async function loadMagomedHistory(orgId3, key) {
  if (!supabaseEnabled2) return [];
  const enc = encodeURIComponent(key);
  const rows = await supabaseFetch2(
    "magomed_messages",
    `select=role,content&organization_id=eq.${orgId3}&thread_key=eq.${enc}&created_at=gte.${memorySinceIso()}&order=created_at.asc&limit=${MEMORY_MAX}`
  ).catch(() => []);
  return rows.map((r) => ({
    role: r.role === "assistant" ? "assistant" : "user",
    content: String(r.content || "")
  }));
}
async function saveMagomedTurn(orgId3, key, userText, assistantText) {
  if (!supabaseEnabled2) return;
  const rows = [];
  if (userText && userText.trim()) {
    rows.push({ organization_id: orgId3, thread_key: key, role: "user", content: userText.slice(0, 4e3) });
  }
  if (assistantText && assistantText.trim()) {
    rows.push({ organization_id: orgId3, thread_key: key, role: "assistant", content: assistantText.slice(0, 8e3) });
  }
  if (rows.length === 0) return;
  await supabaseFetch2("magomed_messages", "", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify(rows)
  }).catch(() => {
  });
  const enc = encodeURIComponent(key);
  await supabaseFetch2(
    "magomed_messages",
    `organization_id=eq.${orgId3}&thread_key=eq.${enc}&created_at=lt.${memorySinceIso()}`,
    { method: "DELETE", headers: { Prefer: "return=minimal" } }
  ).catch(() => {
  });
}
async function supabaseFetch2(table, query = "select=*", init = {}) {
  if (!supabaseEnabled2) throw new Error("SUPABASE_NOT_CONFIGURED");
  const separator = query ? "?" : "";
  const response = await fetch(`${supabaseUrl2}/rest/v1/${table}${separator}${query}`, {
    ...init,
    headers: {
      apikey: supabaseKey2,
      Authorization: `Bearer ${supabaseKey2}`,
      "Content-Type": "application/json",
      ...init.headers || {}
    }
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Supabase ${response.status}: ${text.slice(0, 200)}`);
  }
  return await response.json();
}
function sanitize(q) {
  return String(q ?? "").replace(/[(),*]/g, " ").trim().slice(0, 60);
}
function branchClause(session) {
  return session.dbBranchId ? `&branch_id=eq.${session.dbBranchId}` : "";
}
function fullName(row) {
  return [row.first_name, row.last_name].filter(Boolean).join(" ") || row.full_name || "\u2014";
}
var STUDENT_STATUS_RU = {
  lead: "\u041B\u0438\u0434",
  trial: "\u041F\u0440\u043E\u0431\u043D\u043E\u0435",
  active: "\u0410\u043A\u0442\u0438\u0432\u0435\u043D",
  paused: "\u041F\u0430\u0443\u0437\u0430",
  debt: "\u0414\u043E\u043B\u0436\u043D\u0438\u043A",
  left: "\u0423\u0448\u0451\u043B",
  archived: "\u0412 \u0430\u0440\u0445\u0438\u0432\u0435"
};
var PRIORITY_RU = {
  low: "\u043D\u0438\u0437\u043A\u0438\u0439",
  normal: "\u043E\u0431\u044B\u0447\u043D\u044B\u0439",
  high: "\u0432\u044B\u0441\u043E\u043A\u0438\u0439"
};
async function toolSearchCrm(args, session) {
  const entity = String(args?.entity || "students");
  const q = sanitize(args?.query);
  const enc = encodeURIComponent(`*${q}*`);
  const org = `organization_id=eq.${session.organizationId}`;
  const branch = branchClause(session);
  if (entity === "students") {
    const or = q ? `&or=(first_name.ilike.${enc},last_name.ilike.${enc},middle_name.ilike.${enc},phone.ilike.${enc},parent_name.ilike.${enc},parent_phone.ilike.${enc})` : "";
    const archiveFilter = isFullAccess(session) ? "" : "&status=neq.archived&deletion_requested_at=is.null";
    const limit = isFullAccess(session) ? 50 : 15;
    const rows = await supabaseFetch2(
      "students",
      `select=id,first_name,last_name,middle_name,phone,parent_name,parent_phone,status,group_id&${org}${archiveFilter}${branch}${or}&limit=${limit}`
    );
    return {
      count: rows.length,
      students: rows.map((r) => ({
        id: r.id,
        name: fullName(r),
        phone: r.phone || r.parent_phone || null,
        parent: r.parent_name || null,
        status: STUDENT_STATUS_RU[r.status] || r.status
      }))
    };
  }
  if (entity === "documents") {
    if (!isFullAccess(session)) {
      return { error: "\u0414\u043E\u043A\u0443\u043C\u0435\u043D\u0442\u044B \u0434\u043E\u0441\u0442\u0443\u043F\u043D\u044B \u0442\u043E\u043B\u044C\u043A\u043E \u0432\u043B\u0430\u0434\u0435\u043B\u044C\u0446\u0443 \u0438 \u0440\u0443\u043A\u043E\u0432\u043E\u0434\u0438\u0442\u0435\u043B\u044E." };
    }
    const or = q ? `&or=(contractor.ilike.${enc},subject.ilike.${enc},category.ilike.${enc})` : "";
    const rows = await supabaseFetch2(
      "documents",
      `select=id,category,contractor,subject,amount,currency,status,date_start,date_end&${org}${or}&order=updated_at.desc&limit=30`
    );
    return {
      count: rows.length,
      documents: rows.map((r) => ({
        id: r.id,
        category: r.category || null,
        contractor: r.contractor || null,
        subject: r.subject || null,
        amount: r.amount,
        currency: r.currency,
        status: r.status,
        from: r.date_start || null,
        until: r.date_end || null
      }))
    };
  }
  if (entity === "teachers") {
    const or = q ? `&or=(full_name.ilike.${enc},phone.ilike.${enc})` : "";
    const rows = await supabaseFetch2(
      "users",
      `select=id,full_name,phone,role,branch_id,specialization&${org}&role=eq.teacher${branch}${or}&limit=${isFullAccess(session) ? 50 : 15}`
    );
    return {
      count: rows.length,
      teachers: rows.map((r) => ({
        id: r.id,
        name: r.full_name,
        phone: r.phone || null,
        specialization: r.specialization || null
      }))
    };
  }
  if (entity === "groups") {
    const or = q ? `&name=ilike.${enc}` : "";
    const rows = await supabaseFetch2(
      "groups",
      `select=id,name,branch_id,teacher_id&${org}${branch}${or}&limit=20`
    );
    return { count: rows.length, groups: rows.map((r) => ({ id: r.id, name: r.name })) };
  }
  if (entity === "tasks") {
    const or = q ? `&or=(title.ilike.${enc},description.ilike.${enc})` : "";
    const rows = await supabaseFetch2(
      "tasks",
      `select=id,title,status,priority,due_at,branch_id${branch}${or}&order=created_at.desc&limit=20`
    );
    return {
      count: rows.length,
      tasks: rows.map((r) => ({
        id: r.id,
        title: r.title,
        status: r.status,
        priority: r.priority,
        dueAt: r.due_at
      }))
    };
  }
  if (entity === "performances") {
    if (!isFullAccess(session)) {
      return { error: "\u0412\u044B\u0441\u0442\u0443\u043F\u043B\u0435\u043D\u0438\u044F \u0434\u043E\u0441\u0442\u0443\u043F\u043D\u044B \u0442\u043E\u043B\u044C\u043A\u043E \u0432\u043B\u0430\u0434\u0435\u043B\u044C\u0446\u0443 \u0438 \u0440\u0443\u043A\u043E\u0432\u043E\u0434\u0438\u0442\u0435\u043B\u044E." };
    }
    const or = q ? `&or=(client_name.ilike.${enc},address.ilike.${enc})` : "";
    const rows = await supabaseFetch2(
      "performances",
      `select=id,client_name,event_date,event_time,type,price,status&${org}${or}&order=event_date.desc&limit=30`
    );
    return {
      count: rows.length,
      performances: rows.map((r) => ({
        id: r.id,
        client: r.client_name,
        date: r.event_date,
        time: r.event_time || null,
        type: r.type,
        price: r.price,
        status: r.status
      }))
    };
  }
  if (entity === "products") {
    if (!isFullAccess(session)) {
      return { error: "\u0422\u043E\u0432\u0430\u0440\u044B \u0434\u043E\u0441\u0442\u0443\u043F\u043D\u044B \u0442\u043E\u043B\u044C\u043A\u043E \u0432\u043B\u0430\u0434\u0435\u043B\u044C\u0446\u0443 \u0438 \u0440\u0443\u043A\u043E\u0432\u043E\u0434\u0438\u0442\u0435\u043B\u044E." };
    }
    const or = q ? `&or=(name.ilike.${enc},category.ilike.${enc},sku.ilike.${enc})` : "";
    const rows = await supabaseFetch2(
      "products",
      `select=id,name,category,sku,sale_price,cost_price,min_stock,is_active&${org}${or}&order=name.asc&limit=40`
    );
    return {
      count: rows.length,
      products: rows.map((r) => ({
        id: r.id,
        name: r.name,
        category: r.category || null,
        sku: r.sku || null,
        salePrice: r.sale_price,
        costPrice: r.cost_price,
        minStock: r.min_stock,
        active: r.is_active
      }))
    };
  }
  return {
    error: `\u041D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u0430\u044F \u0441\u0443\u0449\u043D\u043E\u0441\u0442\u044C: ${entity}. \u0414\u043E\u0441\u0442\u0443\u043F\u043D\u043E: students, teachers, groups, tasks, documents, performances, products.`
  };
}
async function toolGetRecordDetails(args, session) {
  const entity = String(args?.entity || "students");
  const id = sanitize(args?.id);
  if (!id) return { error: "\u041D\u0435 \u0443\u043A\u0430\u0437\u0430\u043D id." };
  const branch = branchClause(session);
  if (entity === "students") {
    const rows = await supabaseFetch2(
      "students",
      `select=*&id=eq.${id}${branch}&limit=1`
    );
    const r = rows[0];
    if (!r) return { found: false };
    const subs = await supabaseFetch2(
      "student_subscriptions",
      `select=plan_name,lessons_left,lessons_total,status,ends_on&student_id=eq.${id}&order=ends_on.desc&limit=3`
    ).catch(() => []);
    const payments = await supabaseFetch2(
      "payments",
      `select=amount,paid_at,status&student_id=eq.${id}&order=paid_at.desc&limit=5`
    ).catch(() => []);
    return {
      found: true,
      student: {
        id: r.id,
        name: fullName(r),
        phone: r.phone || null,
        parent: r.parent_name || null,
        parentPhone: r.parent_phone || null,
        status: STUDENT_STATUS_RU[r.status] || r.status,
        birthday: r.birthday || null,
        comment: r.comment || null,
        subscriptions: subs,
        lastPayments: payments
      }
    };
  }
  if (entity === "teachers") {
    const rows = await supabaseFetch2(
      "users",
      `select=*&id=eq.${id}&organization_id=eq.${session.organizationId}&role=eq.teacher${branch}&limit=1`
    );
    const r = rows[0];
    if (!r) return { found: false };
    const comp = isFullAccess(session) ? await supabaseFetch2(
      "teacher_compensation",
      `select=scheme,base_salary,percent,per_lesson_rate,comment&teacher_id=eq.${id}&limit=1`
    ).catch(() => []) : [];
    const groups = await supabaseFetch2(
      "groups",
      `select=id,name&teacher_id=eq.${id}${branch}&limit=50`
    ).catch(() => []);
    const c = comp[0];
    return {
      found: true,
      teacher: {
        id: r.id,
        name: r.full_name,
        phone: r.phone || null,
        email: r.email || null,
        specialization: r.specialization || null,
        status: r.status || null,
        compensation: c ? {
          scheme: c.scheme,
          baseSalary: c.base_salary,
          percent: c.percent,
          perLessonRate: c.per_lesson_rate,
          comment: c.comment || null
        } : null,
        groups: groups.map((g) => ({ id: g.id, name: g.name }))
      }
    };
  }
  if (entity === "documents") {
    if (!isFullAccess(session)) {
      return { error: "\u0414\u043E\u043A\u0443\u043C\u0435\u043D\u0442\u044B \u0434\u043E\u0441\u0442\u0443\u043F\u043D\u044B \u0442\u043E\u043B\u044C\u043A\u043E \u0432\u043B\u0430\u0434\u0435\u043B\u044C\u0446\u0443 \u0438 \u0440\u0443\u043A\u043E\u0432\u043E\u0434\u0438\u0442\u0435\u043B\u044E." };
    }
    const rows = await supabaseFetch2(
      "documents",
      `select=*&id=eq.${id}&organization_id=eq.${session.organizationId}&limit=1`
    );
    return rows[0] ? { found: true, document: rows[0] } : { found: false };
  }
  if (entity === "tasks") {
    const rows = await supabaseFetch2("tasks", `select=*&id=eq.${id}${branch}&limit=1`);
    return rows[0] ? { found: true, task: rows[0] } : { found: false };
  }
  if (entity === "groups") {
    const rows = await supabaseFetch2(
      "groups",
      `select=*&id=eq.${id}&organization_id=eq.${session.organizationId}${branch}&limit=1`
    );
    return rows[0] ? { found: true, group: rows[0] } : { found: false };
  }
  return { error: `\u041D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u0430\u044F \u0441\u0443\u0449\u043D\u043E\u0441\u0442\u044C: ${entity}.` };
}
function periodStartIso(period) {
  const now = /* @__PURE__ */ new Date();
  if (period === "today") {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  }
  if (period === "week") {
    const d = new Date(now);
    d.setDate(d.getDate() - 7);
    return d.toISOString();
  }
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
}
async function toolGetSalesSummary(args, session) {
  const period = ["today", "week", "month"].includes(String(args?.period)) ? String(args?.period) : "month";
  const start = periodStartIso(period);
  const org = `organization_id=eq.${session.organizationId}`;
  const branch = branchClause(session);
  const rows = await supabaseFetch2(
    "payments",
    `select=amount,paid_at,status&${org}&status=eq.paid&paid_at=gte.${start}${branch}&limit=2000`
  );
  const total = rows.reduce((sum, r) => sum + Number(r.amount || 0), 0);
  return {
    period,
    from: start.slice(0, 10),
    paymentsCount: rows.length,
    totalAmount: total,
    currency: "\u20B8",
    scope: session.dbBranchId ? "\u0444\u0438\u043B\u0438\u0430\u043B" : "\u0432\u0441\u044F \u0441\u0435\u0442\u044C"
  };
}
async function toolGetStudentsSummary(_args, session) {
  const org = `organization_id=eq.${session.organizationId}`;
  const branch = branchClause(session);
  const archiveFilter = isFullAccess(session) ? "" : "&status=neq.archived&deletion_requested_at=is.null";
  const rows = await supabaseFetch2(
    "students",
    `select=status&${org}${archiveFilter}${branch}&limit=5000`
  );
  const byStatus = {};
  for (const r of rows) {
    const key = STUDENT_STATUS_RU[r.status] || r.status || "\u2014";
    byStatus[key] = (byStatus[key] || 0) + 1;
  }
  return {
    total: rows.length,
    byStatus,
    scope: session.dbBranchId ? "\u0444\u0438\u043B\u0438\u0430\u043B" : "\u0432\u0441\u044F \u0441\u0435\u0442\u044C"
  };
}
function monthKeyOf(dateStr) {
  return String(dateStr || "").slice(0, 7);
}
async function toolGetFinanceOverview(_args, session) {
  if (session.role !== "owner") {
    return { error: "\u0411\u0443\u0445\u0433\u0430\u043B\u0442\u0435\u0440\u0438\u044F \u0434\u043E\u0441\u0442\u0443\u043F\u043D\u0430 \u0442\u043E\u043B\u044C\u043A\u043E \u0432\u043B\u0430\u0434\u0435\u043B\u044C\u0446\u0443 \u0441\u0435\u0442\u0438." };
  }
  const org = `organization_id=eq.${session.organizationId}`;
  const [accounts, categories, txns] = await Promise.all([
    supabaseFetch2("finance_accounts", `select=*&${org}&order=sort.asc`).catch(() => []),
    supabaseFetch2("finance_categories", `select=*&${org}`).catch(() => []),
    supabaseFetch2(
      "finance_transactions",
      `select=*&${org}&type=in.(income,expense)&order=operation_date.asc&limit=5000`
    ).catch(() => [])
  ]);
  if (txns.length === 0 && accounts.length === 0) {
    return { note: "\u0412 \u0431\u0443\u0445\u0433\u0430\u043B\u0442\u0435\u0440\u0438\u0438 \u043F\u043E\u043A\u0430 \u043D\u0435\u0442 \u043E\u043F\u0435\u0440\u0430\u0446\u0438\u0439 \u0438 \u0441\u0447\u0435\u0442\u043E\u0432." };
  }
  const catName = (id) => categories.find((c) => c.id === id)?.name || "\u0411\u0435\u0437 \u0441\u0442\u0430\u0442\u044C\u0438";
  const actual = txns.filter((t) => (t.status || "actual") === "actual");
  const planned = txns.filter((t) => t.status === "planned");
  const accountsOut = accounts.map((a) => {
    const inc = actual.filter((t) => t.account_id === a.id && t.type === "income").reduce((s, t) => s + Number(t.amount || 0), 0);
    const exp = actual.filter((t) => t.account_id === a.id && t.type === "expense").reduce((s, t) => s + Number(t.amount || 0), 0);
    return { name: a.name, balance: Number(a.opening_balance || 0) + inc - exp };
  });
  const months = Array.from(new Set(actual.map((t) => monthKeyOf(t.operation_date)))).sort().slice(-6);
  const pnl = months.map((m) => {
    const income = actual.filter((t) => t.type === "income" && monthKeyOf(t.operation_date) === m).reduce((s, t) => s + Number(t.amount || 0), 0);
    const expense = actual.filter((t) => t.type === "expense" && monthKeyOf(t.operation_date) === m).reduce((s, t) => s + Number(t.amount || 0), 0);
    const profit = income - expense;
    return { month: m, income, expense, profit, margin: income > 0 ? Math.round(profit / income * 100) : 0 };
  });
  const topBy = (kind) => {
    const map = {};
    for (const t of actual.filter((x) => x.type === kind)) {
      const key = catName(t.category_id);
      map[key] = (map[key] || 0) + Number(t.amount || 0);
    }
    return Object.entries(map).map(([category, amount]) => ({ category, amount })).sort((a, b) => b.amount - a.amount).slice(0, 5);
  };
  const incomeTotal = actual.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount || 0), 0);
  const expenseTotal = actual.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount || 0), 0);
  const plannedIn = planned.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount || 0), 0);
  const plannedOut = planned.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount || 0), 0);
  return {
    currency: "\u20B8",
    scope: "\u0432\u0441\u044F \u0441\u0435\u0442\u044C",
    totals: {
      income: incomeTotal,
      expense: expenseTotal,
      profit: incomeTotal - expenseTotal,
      margin: incomeTotal > 0 ? Math.round((incomeTotal - expenseTotal) / incomeTotal * 100) : 0,
      balanceTotal: accountsOut.reduce((s, a) => s + a.balance, 0),
      plannedIncome: plannedIn,
      plannedExpense: plannedOut
    },
    accounts: accountsOut,
    monthlyPnl: pnl,
    topExpenseCategories: topBy("expense"),
    topIncomeCategories: topBy("income")
  };
}
async function toolGetMarketingFunnel(_args, session) {
  const org = `organization_id=eq.${session.organizationId}`;
  const branch = branchClause(session);
  const [students, sources] = await Promise.all([
    supabaseFetch2(
      "students",
      `select=status,source_id,created_at&${org}&deletion_requested_at=is.null${branch}&limit=5000`
    ),
    supabaseFetch2("lead_sources", `select=id,name`).catch(() => [])
  ]);
  const sourceName = (id) => id && sources.find((s) => s.id === id)?.name || "\u0411\u0435\u0437 \u0438\u0441\u0442\u043E\u0447\u043D\u0438\u043A\u0430";
  const order = ["lead", "trial", "active", "paused", "debt", "left", "archived"];
  const funnel = {};
  for (const st of order) funnel[STUDENT_STATUS_RU[st] || st] = 0;
  for (const r of students) {
    const key = STUDENT_STATUS_RU[r.status] || r.status || "\u2014";
    funnel[key] = (funnel[key] || 0) + 1;
  }
  const bySrc = {};
  for (const r of students) {
    const name = sourceName(r.source_id);
    if (!bySrc[name]) bySrc[name] = { total: 0, active: 0 };
    bySrc[name].total += 1;
    if (r.status === "active") bySrc[name].active += 1;
  }
  const bySource = Object.entries(bySrc).map(([source, v]) => ({
    source,
    total: v.total,
    active: v.active,
    conversion: v.total > 0 ? Math.round(v.active / v.total * 100) : 0
  })).sort((a, b) => b.total - a.total);
  const monthStart = /* @__PURE__ */ new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const newThisMonth = students.filter((r) => r.created_at && new Date(r.created_at) >= monthStart).length;
  const leads = funnel[STUDENT_STATUS_RU.lead] || 0;
  const active = funnel[STUDENT_STATUS_RU.active] || 0;
  const total = students.length;
  return {
    scope: session.dbBranchId ? "\u0444\u0438\u043B\u0438\u0430\u043B" : "\u0432\u0441\u044F \u0441\u0435\u0442\u044C",
    totalStudents: total,
    newStudentsThisMonth: newThisMonth,
    funnelByStatus: funnel,
    leadToActiveConversion: total > 0 ? Math.round(active / total * 100) : 0,
    hint: leads > 0 ? `${leads} \u043B\u0438\u0434\u043E\u0432 \u0435\u0449\u0451 \u043D\u0435 \u0441\u043A\u043E\u043D\u0432\u0435\u0440\u0442\u0438\u0440\u043E\u0432\u0430\u043D\u044B` : void 0,
    bySource
  };
}
async function toolGetAttendanceSummary(args, session) {
  if (!isFullAccess(session)) {
    return { error: "\u0421\u0432\u043E\u0434\u043A\u0430 \u043F\u043E\u0441\u0435\u0449\u0430\u0435\u043C\u043E\u0441\u0442\u0438 \u0434\u043E\u0441\u0442\u0443\u043F\u043D\u0430 \u0442\u043E\u043B\u044C\u043A\u043E \u0432\u043B\u0430\u0434\u0435\u043B\u044C\u0446\u0443 \u0438 \u0440\u0443\u043A\u043E\u0432\u043E\u0434\u0438\u0442\u0435\u043B\u044E." };
  }
  const period = ["today", "week", "month"].includes(String(args?.period)) ? String(args?.period) : "month";
  const startIso = periodStartIso(period);
  const rows = await supabaseFetch2(
    "attendance",
    `select=status&marked_at=gte.${startIso}&limit=5000`
  ).catch(() => []);
  const byStatus = {};
  let present = 0;
  let marked = 0;
  for (const r of rows) {
    const s = r.status || "unknown";
    byStatus[s] = (byStatus[s] || 0) + 1;
    if (s !== "unknown") marked += 1;
    if (s === "present") present += 1;
  }
  return {
    period,
    from: startIso.slice(0, 10),
    totalMarks: rows.length,
    byStatus,
    attendanceRate: marked ? Math.round(present / marked * 100) : 0
  };
}
async function toolGetSchedule(args, session) {
  if (!isFullAccess(session)) {
    return { error: "\u0420\u0430\u0441\u043F\u0438\u0441\u0430\u043D\u0438\u0435 \u0434\u043E\u0441\u0442\u0443\u043F\u043D\u043E \u0442\u043E\u043B\u044C\u043A\u043E \u0432\u043B\u0430\u0434\u0435\u043B\u044C\u0446\u0443 \u0438 \u0440\u0443\u043A\u043E\u0432\u043E\u0434\u0438\u0442\u0435\u043B\u044E." };
  }
  const raw = sanitize(args?.date);
  const date = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  const rows = await supabaseFetch2(
    "schedule_lessons",
    `select=starts_at,ends_at,status,group:groups(name),teacher:users!schedule_lessons_teacher_id_fkey(full_name),hall:halls(name)&starts_at=gte.${date}T00:00:00&starts_at=lte.${date}T23:59:59&order=starts_at.asc&limit=200`
  ).catch(() => []);
  return {
    date,
    count: rows.length,
    lessons: rows.map((r) => ({
      from: r.starts_at,
      to: r.ends_at,
      status: r.status,
      group: r.group?.name || null,
      teacher: r.teacher?.full_name || null,
      hall: r.hall?.name || null
    }))
  };
}
async function toolListBranches(_args, session) {
  if (!isFullAccess(session)) {
    return { error: "\u0421\u043F\u0438\u0441\u043E\u043A \u0444\u0438\u043B\u0438\u0430\u043B\u043E\u0432 \u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D \u0442\u043E\u043B\u044C\u043A\u043E \u0432\u043B\u0430\u0434\u0435\u043B\u044C\u0446\u0443 \u0438 \u0440\u0443\u043A\u043E\u0432\u043E\u0434\u0438\u0442\u0435\u043B\u044E." };
  }
  const rows = await supabaseFetch2(
    "branches",
    `select=id,name,city,status,halls(name,capacity)&limit=50`
  ).catch(() => []);
  return {
    count: rows.length,
    branches: rows.map((b) => ({
      id: b.id,
      name: b.name,
      city: b.city || null,
      status: b.status,
      halls: (b.halls || []).map((h) => ({ name: h.name, capacity: h.capacity }))
    }))
  };
}
var AFFIRM_RE = /^(да|ага|угу|ок|окей|окей|подтвержд\w*|подтверждаю|верно|всё верно|все верно|давай|давайте|конечно|yes|yep|yeah|sure|ok|okay)\b/i;
function isAffirmation(text) {
  const t = (text || "").trim();
  return t.length > 0 && t.length <= 30 && AFFIRM_RE.test(t);
}
async function toolCreateTask(args, session, lastUserText) {
  const title = String(args?.title ?? "").trim().slice(0, 200);
  if (!title) return { error: "\u041D\u0435 \u0443\u043A\u0430\u0437\u0430\u043D \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043E\u043A \u0437\u0430\u0434\u0430\u0447\u0438." };
  const priority = ["low", "normal", "high"].includes(String(args?.priority)) ? String(args?.priority) : "normal";
  const description = args?.description ? String(args.description).slice(0, 1e3) : null;
  const dueAt = args?.dueAt ? String(args.dueAt).slice(0, 40) : null;
  let studentId = null;
  let studentName = null;
  if (args?.studentName) {
    const found = await toolSearchCrm(
      { entity: "students", query: args.studentName },
      session
    );
    const first = found?.students?.[0];
    if (first) {
      studentId = first.id;
      studentName = first.name;
    }
  }
  const preview = {
    title,
    priority: PRIORITY_RU[priority],
    dueAt,
    student: studentName,
    scope: session.dbBranchId ? "\u0444\u0438\u043B\u0438\u0430\u043B" : "\u0432\u0441\u044F \u0441\u0435\u0442\u044C"
  };
  if (!isAffirmation(lastUserText)) {
    return {
      needsConfirmation: true,
      willCreate: preview,
      instruction: "\u041D\u0415 \u0441\u043E\u0437\u0434\u0430\u0432\u0430\u0439 \u0437\u0430\u0434\u0430\u0447\u0443 \u0441\u0435\u0439\u0447\u0430\u0441. \u041F\u043E\u043A\u0430\u0436\u0438 \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044E \u043F\u0440\u0435\u0432\u044C\u044E (\u0447\u0442\u043E \u0431\u0443\u0434\u0435\u0442 \u0441\u043E\u0437\u0434\u0430\u043D\u043E) \u0438 \u043F\u043E\u043F\u0440\u043E\u0441\u0438 \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u044C \u0434\u043E\u0441\u043B\u043E\u0432\u043D\u043E: \xAB\u041D\u0430\u043F\u0438\u0448\u0438\u0442\u0435 \xAB\u0414\u0430\xBB \u0434\u043B\u044F \u0441\u043E\u0437\u0434\u0430\u043D\u0438\u044F\xBB. \u0417\u0430\u0434\u0430\u0447\u0430 \u0431\u0443\u0434\u0435\u0442 \u0441\u043E\u0437\u0434\u0430\u043D\u0430 \u0442\u043E\u043B\u044C\u043A\u043E \u043F\u043E\u0441\u043B\u0435 \u0442\u043E\u0433\u043E, \u043A\u0430\u043A \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044C \u043E\u0442\u0432\u0435\u0442\u0438\u0442 \xAB\u0414\u0430\xBB."
    };
  }
  const inserted = await supabaseFetch2("tasks", "", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      branch_id: session.dbBranchId,
      student_id: studentId,
      title,
      description,
      status: "new",
      priority,
      due_at: dueAt
    })
  });
  return {
    created: true,
    taskId: inserted?.[0]?.id ?? null,
    task: preview
  };
}
async function executeTool(name, args, session, lastUserText) {
  try {
    if (!supabaseEnabled2) {
      return { error: "\u0411\u0430\u0437\u0430 \u0434\u0430\u043D\u043D\u044B\u0445 \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u043D\u0430 (Supabase \u043D\u0435 \u043D\u0430\u0441\u0442\u0440\u043E\u0435\u043D). \u0421\u043E\u043E\u0431\u0449\u0438 \u043E\u0431 \u044D\u0442\u043E\u043C \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044E." };
    }
    if (name === "search_crm") return await toolSearchCrm(args, session);
    if (name === "get_record_details") return await toolGetRecordDetails(args, session);
    if (name === "get_sales_summary") return await toolGetSalesSummary(args, session);
    if (name === "get_students_summary") return await toolGetStudentsSummary(args, session);
    if (name === "get_finance_overview") return await toolGetFinanceOverview(args, session);
    if (name === "get_marketing_funnel") return await toolGetMarketingFunnel(args, session);
    if (name === "get_attendance_summary") return await toolGetAttendanceSummary(args, session);
    if (name === "get_schedule") return await toolGetSchedule(args, session);
    if (name === "list_branches") return await toolListBranches(args, session);
    if (name === "consult_colleague") return await consultColleague(args, session);
    if (name === "create_task") return await toolCreateTask(args, session, lastUserText);
    return { error: `\u041D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u044B\u0439 \u0438\u043D\u0441\u0442\u0440\u0443\u043C\u0435\u043D\u0442: ${name}` };
  } catch (e) {
    if (e?.message === "SUPABASE_NOT_CONFIGURED") {
      return { error: "\u0411\u0430\u0437\u0430 \u0434\u0430\u043D\u043D\u044B\u0445 \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u043D\u0430 (Supabase \u043D\u0435 \u043D\u0430\u0441\u0442\u0440\u043E\u0435\u043D)." };
    }
    return { error: `\u041E\u0448\u0438\u0431\u043A\u0430 \u043E\u0431\u0440\u0430\u0449\u0435\u043D\u0438\u044F \u043A \u0431\u0430\u0437\u0435: ${e?.message || "unknown"}` };
  }
}
var tools = [
  {
    name: "search_crm",
    description: "\u041F\u043E\u0438\u0441\u043A \u0437\u0430\u043F\u0438\u0441\u0435\u0439 \u0432 CRM \u043F\u043E \u0438\u043C\u0435\u043D\u0438, \u0442\u0435\u043B\u0435\u0444\u043E\u043D\u0443, \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u044E \u0438\u043B\u0438 \u043A\u043E\u043D\u0442\u0440\u0430\u0433\u0435\u043D\u0442\u0443. \u0412\u043E\u0437\u0432\u0440\u0430\u0449\u0430\u0435\u0442 \u043A\u0440\u0430\u0442\u043A\u0438\u0439 \u0441\u043F\u0438\u0441\u043E\u043A \u0441 id. \u0418\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439, \u043A\u043E\u0433\u0434\u0430 \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044C \u0438\u0449\u0435\u0442 \u0443\u0447\u0435\u043D\u0438\u043A\u0430, \u043F\u0440\u0435\u043F\u043E\u0434\u0430\u0432\u0430\u0442\u0435\u043B\u044F, \u0433\u0440\u0443\u043F\u043F\u0443, \u0437\u0430\u0434\u0430\u0447\u0443 \u0438\u043B\u0438 \u0434\u043E\u043A\u0443\u043C\u0435\u043D\u0442/\u0434\u043E\u0433\u043E\u0432\u043E\u0440. \u0423 \u0432\u043B\u0430\u0434\u0435\u043B\u044C\u0446\u0430 \u0438 \u0440\u0443\u043A\u043E\u0432\u043E\u0434\u0438\u0442\u0435\u043B\u044F \u043F\u043E\u0438\u0441\u043A \u0443\u0447\u0435\u043D\u0438\u043A\u043E\u0432 \u043E\u0445\u0432\u0430\u0442\u044B\u0432\u0430\u0435\u0442 \u0432\u0441\u044E \u0441\u0435\u0442\u044C, \u0432\u043A\u043B\u044E\u0447\u0430\u044F \u0430\u0440\u0445\u0438\u0432; \u0434\u043E\u043A\u0443\u043C\u0435\u043D\u0442\u044B \u0434\u043E\u0441\u0442\u0443\u043F\u043D\u044B \u0442\u043E\u043B\u044C\u043A\u043E \u0438\u043C.",
    input_schema: {
      type: "object",
      properties: {
        entity: {
          type: "string",
          enum: ["students", "teachers", "groups", "tasks", "documents", "performances", "products"],
          description: "\u0422\u0438\u043F \u0437\u0430\u043F\u0438\u0441\u0438. documents \u2014 \u0434\u043E\u0433\u043E\u0432\u043E\u0440\u044B, performances \u2014 \u0432\u044B\u0441\u0442\u0443\u043F\u043B\u0435\u043D\u0438\u044F/\u043A\u043E\u043D\u0446\u0435\u0440\u0442\u044B, products \u2014 \u0442\u043E\u0432\u0430\u0440\u044B/\u0441\u043A\u043B\u0430\u0434 (\u044D\u0442\u0438 \u0442\u0440\u0438 \u2014 \u0442\u043E\u043B\u044C\u043A\u043E \u0432\u043B\u0430\u0434\u0435\u043B\u0435\u0446 \u0438 \u0440\u0443\u043A\u043E\u0432\u043E\u0434\u0438\u0442\u0435\u043B\u044C)."
        },
        query: {
          type: "string",
          description: "\u041F\u043E\u0438\u0441\u043A\u043E\u0432\u0430\u044F \u0441\u0442\u0440\u043E\u043A\u0430: \u0438\u043C\u044F, \u0444\u0430\u043C\u0438\u043B\u0438\u044F, \u0442\u0435\u043B\u0435\u0444\u043E\u043D, \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 \u0438\u043B\u0438 \u043A\u043E\u043D\u0442\u0440\u0430\u0433\u0435\u043D\u0442. \u041C\u043E\u0436\u0435\u0442 \u0431\u044B\u0442\u044C \u043F\u0443\u0441\u0442\u043E\u0439 \u0434\u043B\u044F \u0441\u043F\u0438\u0441\u043A\u0430."
        }
      },
      required: ["entity"]
    }
  },
  {
    name: "get_record_details",
    description: "\u041F\u043E\u043B\u043D\u0430\u044F \u043A\u0430\u0440\u0442\u043E\u0447\u043A\u0430 \u043E\u0434\u043D\u043E\u0439 \u0437\u0430\u043F\u0438\u0441\u0438 \u043F\u043E \u0435\u0451 id (\u043F\u043E\u043B\u0443\u0447\u0438 id \u0447\u0435\u0440\u0435\u0437 search_crm). \u0423\u0447\u0435\u043D\u0438\u043A \u2014 \u0430\u0431\u043E\u043D\u0435\u043C\u0435\u043D\u0442\u044B \u0438 \u043F\u043E\u0441\u043B\u0435\u0434\u043D\u0438\u0435 \u043E\u043F\u043B\u0430\u0442\u044B. \u041F\u0440\u0435\u043F\u043E\u0434\u0430\u0432\u0430\u0442\u0435\u043B\u044C \u2014 \u043A\u043E\u043D\u0442\u0430\u043A\u0442\u044B, \u0441\u0445\u0435\u043C\u0430 \u0437\u0430\u0440\u043F\u043B\u0430\u0442\u044B \u0438 \u0433\u0440\u0443\u043F\u043F\u044B. \u0414\u043E\u043A\u0443\u043C\u0435\u043D\u0442 \u2014 \u0432\u0441\u0435 \u043F\u043E\u043B\u044F \u0434\u043E\u0433\u043E\u0432\u043E\u0440\u0430 (\u0442\u043E\u043B\u044C\u043A\u043E \u0432\u043B\u0430\u0434\u0435\u043B\u0435\u0446 \u0438 \u0440\u0443\u043A\u043E\u0432\u043E\u0434\u0438\u0442\u0435\u043B\u044C).",
    input_schema: {
      type: "object",
      properties: {
        entity: { type: "string", enum: ["students", "teachers", "groups", "tasks", "documents"] },
        id: { type: "string", description: "UUID \u0437\u0430\u043F\u0438\u0441\u0438" }
      },
      required: ["entity", "id"]
    }
  },
  {
    name: "get_sales_summary",
    description: "\u0421\u0432\u043E\u0434\u043A\u0430 \u043F\u043E \u043E\u043F\u043B\u0430\u0442\u0430\u043C (\u0432\u044B\u0440\u0443\u0447\u043A\u0430) \u0437\u0430 \u043F\u0435\u0440\u0438\u043E\u0434: \u0441\u0435\u0433\u043E\u0434\u043D\u044F, \u043D\u0435\u0434\u0435\u043B\u044F \u0438\u043B\u0438 \u043C\u0435\u0441\u044F\u0446. \u0421\u043A\u043E\u0443\u043F \u0437\u0430\u0432\u0438\u0441\u0438\u0442 \u043E\u0442 \u0440\u043E\u043B\u0438: \u0432\u043B\u0430\u0434\u0435\u043B\u0435\u0446 \u0432\u0438\u0434\u0438\u0442 \u0432\u0441\u044E \u0441\u0435\u0442\u044C, \u043E\u0441\u0442\u0430\u043B\u044C\u043D\u044B\u0435 \u2014 \u0441\u0432\u043E\u0439 \u0444\u0438\u043B\u0438\u0430\u043B.",
    input_schema: {
      type: "object",
      properties: {
        period: { type: "string", enum: ["today", "week", "month"] }
      },
      required: ["period"]
    }
  },
  {
    name: "get_students_summary",
    description: "\u0421\u0432\u043E\u0434\u043A\u0430 \u043F\u043E \u0443\u0447\u0435\u043D\u0438\u043A\u0430\u043C: \u043E\u0431\u0449\u0435\u0435 \u043A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u043E \u0438 \u0440\u0430\u0437\u0431\u0438\u0432\u043A\u0430 \u043F\u043E \u0441\u0442\u0430\u0442\u0443\u0441\u0430\u043C (\u0410\u043A\u0442\u0438\u0432\u0435\u043D, \u0414\u043E\u043B\u0436\u043D\u0438\u043A, \u041F\u0440\u043E\u0431\u043D\u043E\u0435, \u041B\u0438\u0434, \u041F\u0430\u0443\u0437\u0430, \u0423\u0448\u0451\u043B). \u0418\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439 \u0434\u043B\u044F \u0432\u043E\u043F\u0440\u043E\u0441\u043E\u0432 \u0432\u0438\u0434\u0430 \xAB\u0441\u043A\u043E\u043B\u044C\u043A\u043E \u0430\u043A\u0442\u0438\u0432\u043D\u044B\u0445 \u0443\u0447\u0435\u043D\u0438\u043A\u043E\u0432\xBB, \xAB\u0441\u043A\u043E\u043B\u044C\u043A\u043E \u0434\u043E\u043B\u0436\u043D\u0438\u043A\u043E\u0432\xBB, \xAB\u0441\u043A\u043E\u043B\u044C\u043A\u043E \u0432\u0441\u0435\u0433\u043E \u0443\u0447\u0435\u043D\u0438\u043A\u043E\u0432\xBB. \u0421\u043A\u043E\u0443\u043F \u0437\u0430\u0432\u0438\u0441\u0438\u0442 \u043E\u0442 \u0440\u043E\u043B\u0438.",
    input_schema: { type: "object", properties: {} }
  },
  {
    name: "get_finance_overview",
    description: "\u0424\u0438\u043D\u0430\u043D\u0441\u043E\u0432\u0430\u044F \u0441\u0432\u043E\u0434\u043A\u0430 \u043F\u043E \u0431\u0443\u0445\u0433\u0430\u043B\u0442\u0435\u0440\u0438\u0438 (\u0414\u0414\u0421/\u041E\u041F\u0438\u0423): \u0438\u0442\u043E\u0433\u0438 \u0434\u043E\u0445\u043E\u0434\u043E\u0432/\u0440\u0430\u0441\u0445\u043E\u0434\u043E\u0432/\u043F\u0440\u0438\u0431\u044B\u043B\u0438 \u0438 \u043C\u0430\u0440\u0436\u0430, \u043E\u0441\u0442\u0430\u0442\u043A\u0438 \u043F\u043E \u0441\u0447\u0435\u0442\u0430\u043C, \u043F\u043E\u043C\u0435\u0441\u044F\u0447\u043D\u0430\u044F \u0434\u0438\u043D\u0430\u043C\u0438\u043A\u0430 (P&L \u0437\u0430 \u043F\u043E\u0441\u043B\u0435\u0434\u043D\u0438\u0435 \u043C\u0435\u0441\u044F\u0446\u044B), \u0442\u043E\u043F \u0441\u0442\u0430\u0442\u0435\u0439 \u0440\u0430\u0441\u0445\u043E\u0434\u043E\u0432 \u0438 \u0434\u043E\u0445\u043E\u0434\u043E\u0432, \u043F\u043B\u0430\u043D\u043E\u0432\u044B\u0435 \u043F\u043E\u0441\u0442\u0443\u043F\u043B\u0435\u043D\u0438\u044F \u0438 \u0432\u044B\u043F\u043B\u0430\u0442\u044B. \u0418\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439 \u0434\u043B\u044F \u0432\u043E\u043F\u0440\u043E\u0441\u043E\u0432 \u043F\u0440\u043E \u0434\u0435\u043D\u044C\u0433\u0438, \u043F\u0440\u0438\u0431\u044B\u043B\u044C, \u0440\u0430\u0441\u0445\u043E\u0434\u044B, \u043D\u0430\u043B\u043E\u0433\u0438, \u0444\u0438\u043D\u0430\u043D\u0441\u043E\u0432\u043E\u0435 \u043F\u043B\u0430\u043D\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u0435. \u0414\u043E\u0441\u0442\u0443\u043F\u043D\u043E \u0442\u043E\u043B\u044C\u043A\u043E \u0432\u043B\u0430\u0434\u0435\u043B\u044C\u0446\u0443.",
    input_schema: { type: "object", properties: {} }
  },
  {
    name: "get_marketing_funnel",
    description: "\u041C\u0430\u0440\u043A\u0435\u0442\u0438\u043D\u0433\u043E\u0432\u0430\u044F \u0432\u043E\u0440\u043E\u043D\u043A\u0430 \u0438 \u0438\u0441\u0442\u043E\u0447\u043D\u0438\u043A\u0438 \u043B\u0438\u0434\u043E\u0432: \u043A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u043E \u0443\u0447\u0435\u043D\u0438\u043A\u043E\u0432 \u043F\u043E \u0441\u0442\u0430\u0442\u0443\u0441\u0430\u043C (\u041B\u0438\u0434 \u2192 \u041F\u0440\u043E\u0431\u043D\u043E\u0435 \u2192 \u0410\u043A\u0442\u0438\u0432\u0435\u043D \u2192 \u041F\u0430\u0443\u0437\u0430 \u2192 \u0414\u043E\u043B\u0436\u043D\u0438\u043A \u2192 \u0423\u0448\u0451\u043B), \u043D\u043E\u0432\u044B\u0435 \u0443\u0447\u0435\u043D\u0438\u043A\u0438 \u0437\u0430 \u0442\u0435\u043A\u0443\u0449\u0438\u0439 \u043C\u0435\u0441\u044F\u0446, \u043A\u043E\u043D\u0432\u0435\u0440\u0441\u0438\u044F \u043B\u0438\u0434\u2192\u0430\u043A\u0442\u0438\u0432, \u0430 \u0442\u0430\u043A\u0436\u0435 \u0440\u0430\u0437\u0431\u0438\u0432\u043A\u0430 \u043F\u043E \u0440\u0435\u043A\u043B\u0430\u043C\u043D\u044B\u043C \u0438\u0441\u0442\u043E\u0447\u043D\u0438\u043A\u0430\u043C \u0441 \u043A\u043E\u043D\u0432\u0435\u0440\u0441\u0438\u0435\u0439 \u043A\u0430\u0436\u0434\u043E\u0433\u043E \u0432 \u0430\u043A\u0442\u0438\u0432\u043D\u044B\u0445. \u0418\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439 \u0434\u043B\u044F \u0432\u043E\u043F\u0440\u043E\u0441\u043E\u0432 \u043F\u0440\u043E \u0432\u043E\u0440\u043E\u043D\u043A\u0443, \u0438\u0441\u0442\u043E\u0447\u043D\u0438\u043A\u0438 \u0442\u0440\u0430\u0444\u0438\u043A\u0430, \u043A\u043E\u043D\u0432\u0435\u0440\u0441\u0438\u044E, \u043F\u0440\u0438\u0432\u043B\u0435\u0447\u0435\u043D\u0438\u0435 \u0438 \u0443\u0434\u0435\u0440\u0436\u0430\u043D\u0438\u0435.",
    input_schema: { type: "object", properties: {} }
  },
  {
    name: "get_attendance_summary",
    description: "\u0421\u0432\u043E\u0434\u043A\u0430 \u043F\u043E\u0441\u0435\u0449\u0430\u0435\u043C\u043E\u0441\u0442\u0438 \u0437\u0430 \u043F\u0435\u0440\u0438\u043E\u0434 (\u0441\u0435\u0433\u043E\u0434\u043D\u044F/\u043D\u0435\u0434\u0435\u043B\u044F/\u043C\u0435\u0441\u044F\u0446): \u0432\u0441\u0435\u0433\u043E \u043E\u0442\u043C\u0435\u0442\u043E\u043A, \u0440\u0430\u0437\u0431\u0438\u0432\u043A\u0430 \u043F\u043E \u0441\u0442\u0430\u0442\u0443\u0441\u0430\u043C \u0438 \u043F\u0440\u043E\u0446\u0435\u043D\u0442 \u043F\u043E\u0441\u0435\u0449\u0430\u0435\u043C\u043E\u0441\u0442\u0438. \u0418\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439 \u0434\u043B\u044F \u0432\u043E\u043F\u0440\u043E\u0441\u043E\u0432 \u043F\u0440\u043E \u043F\u043E\u0441\u0435\u0449\u0430\u0435\u043C\u043E\u0441\u0442\u044C, \u044F\u0432\u043A\u0443, \u043F\u0440\u043E\u043F\u0443\u0441\u043A\u0438. \u0414\u043E\u0441\u0442\u0443\u043F\u043D\u043E \u0442\u043E\u043B\u044C\u043A\u043E \u0432\u043B\u0430\u0434\u0435\u043B\u044C\u0446\u0443 \u0438 \u0440\u0443\u043A\u043E\u0432\u043E\u0434\u0438\u0442\u0435\u043B\u044E.",
    input_schema: {
      type: "object",
      properties: { period: { type: "string", enum: ["today", "week", "month"] } },
      required: ["period"]
    }
  },
  {
    name: "get_schedule",
    description: "\u0420\u0430\u0441\u043F\u0438\u0441\u0430\u043D\u0438\u0435 \u0437\u0430\u043D\u044F\u0442\u0438\u0439 \u043D\u0430 \u043A\u043E\u043D\u043A\u0440\u0435\u0442\u043D\u044B\u0439 \u0434\u0435\u043D\u044C: \u0432\u0440\u0435\u043C\u044F, \u0433\u0440\u0443\u043F\u043F\u0430, \u043F\u0440\u0435\u043F\u043E\u0434\u0430\u0432\u0430\u0442\u0435\u043B\u044C, \u0437\u0430\u043B, \u0441\u0442\u0430\u0442\u0443\u0441. \u0418\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439 \u0434\u043B\u044F \u0432\u043E\u043F\u0440\u043E\u0441\u043E\u0432 \u043F\u0440\u043E \u0440\u0430\u0441\u043F\u0438\u0441\u0430\u043D\u0438\u0435, \u0437\u0430\u043D\u044F\u0442\u0438\u044F, \u0437\u0430\u0433\u0440\u0443\u0437\u043A\u0443 \u0437\u0430\u043B\u043E\u0432 \u043D\u0430 \u0434\u0430\u0442\u0443. \u0414\u043E\u0441\u0442\u0443\u043F\u043D\u043E \u0442\u043E\u043B\u044C\u043A\u043E \u0432\u043B\u0430\u0434\u0435\u043B\u044C\u0446\u0443 \u0438 \u0440\u0443\u043A\u043E\u0432\u043E\u0434\u0438\u0442\u0435\u043B\u044E.",
    input_schema: {
      type: "object",
      properties: {
        date: { type: "string", description: "\u0414\u0430\u0442\u0430 \u0432 \u0444\u043E\u0440\u043C\u0430\u0442\u0435 YYYY-MM-DD. \u041F\u043E \u0443\u043C\u043E\u043B\u0447\u0430\u043D\u0438\u044E \u2014 \u0441\u0435\u0433\u043E\u0434\u043D\u044F." }
      }
    }
  },
  {
    name: "list_branches",
    description: "\u0421\u043F\u0438\u0441\u043E\u043A \u0444\u0438\u043B\u0438\u0430\u043B\u043E\u0432 \u0441\u0435\u0442\u0438 \u0441 \u0437\u0430\u043B\u0430\u043C\u0438 (\u043D\u0430\u0437\u0432\u0430\u043D\u0438\u0435, \u0433\u043E\u0440\u043E\u0434, \u0441\u0442\u0430\u0442\u0443\u0441, \u0437\u0430\u043B\u044B \u0438 \u0438\u0445 \u0432\u043C\u0435\u0441\u0442\u0438\u043C\u043E\u0441\u0442\u044C). \u0418\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439 \u0434\u043B\u044F \u0432\u043E\u043F\u0440\u043E\u0441\u043E\u0432 \u043F\u0440\u043E \u0444\u0438\u043B\u0438\u0430\u043B\u044B, \u0437\u0430\u043B\u044B, \u0441\u0442\u0440\u0443\u043A\u0442\u0443\u0440\u0443 \u0441\u0435\u0442\u0438. \u0414\u043E\u0441\u0442\u0443\u043F\u043D\u043E \u0442\u043E\u043B\u044C\u043A\u043E \u0432\u043B\u0430\u0434\u0435\u043B\u044C\u0446\u0443 \u0438 \u0440\u0443\u043A\u043E\u0432\u043E\u0434\u0438\u0442\u0435\u043B\u044E.",
    input_schema: { type: "object", properties: {} }
  },
  {
    name: "create_task",
    description: "\u0421\u043E\u0437\u0434\u0430\u0442\u044C \u0437\u0430\u0434\u0430\u0447\u0443 \u0432 CRM. \u0412\u0410\u0416\u041D\u041E: \u0441\u043D\u0430\u0447\u0430\u043B\u0430 \u0432\u044B\u0437\u043E\u0432\u0438 \u0431\u0435\u0437 confirmed (\u0438\u043B\u0438 confirmed=false), \u0447\u0442\u043E\u0431\u044B \u043F\u043E\u043B\u0443\u0447\u0438\u0442\u044C \u043F\u0440\u0435\u0432\u044C\u044E, \u043F\u043E\u043A\u0430\u0436\u0438 \u0435\u0433\u043E \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044E \u0438 \u043F\u043E\u043F\u0440\u043E\u0441\u0438 \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u0438\u0435. \u0412\u044B\u0437\u044B\u0432\u0430\u0439 \u0441 confirmed=true \u0422\u041E\u041B\u042C\u041A\u041E \u043F\u043E\u0441\u043B\u0435 \u044F\u0432\u043D\u043E\u0433\u043E \u0441\u043E\u0433\u043B\u0430\u0441\u0438\u044F \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044F.",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string", description: "\u0417\u0430\u0433\u043E\u043B\u043E\u0432\u043E\u043A \u0437\u0430\u0434\u0430\u0447\u0438" },
        description: { type: "string", description: "\u041E\u043F\u0438\u0441\u0430\u043D\u0438\u0435 (\u043D\u0435\u043E\u0431\u044F\u0437\u0430\u0442\u0435\u043B\u044C\u043D\u043E)" },
        priority: { type: "string", enum: ["low", "normal", "high"] },
        dueAt: {
          type: "string",
          description: "\u0421\u0440\u043E\u043A \u0432 ISO-\u0444\u043E\u0440\u043C\u0430\u0442\u0435, \u043D\u0430\u043F\u0440. 2026-06-25 (\u043D\u0435\u043E\u0431\u044F\u0437\u0430\u0442\u0435\u043B\u044C\u043D\u043E)"
        },
        studentName: {
          type: "string",
          description: "\u0418\u043C\u044F \u0443\u0447\u0435\u043D\u0438\u043A\u0430 \u0434\u043B\u044F \u043F\u0440\u0438\u0432\u044F\u0437\u043A\u0438 \u0437\u0430\u0434\u0430\u0447\u0438 (\u043D\u0435\u043E\u0431\u044F\u0437\u0430\u0442\u0435\u043B\u044C\u043D\u043E)"
        },
        confirmed: {
          type: "boolean",
          description: "true \u2014 \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044C \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u043B \u0441\u043E\u0437\u0434\u0430\u043D\u0438\u0435. \u0418\u043D\u0430\u0447\u0435 \u0432\u0435\u0440\u043D\u0451\u0442\u0441\u044F \u0442\u043E\u043B\u044C\u043A\u043E \u043F\u0440\u0435\u0432\u044C\u044E."
        }
      },
      required: ["title"]
    }
  }
];
var SYSTEM_PROMPT = `\u0422\u044B \u2014 \u041C\u0430\u0433\u043E\u043C\u0435\u0434, \u0443\u043C\u043D\u044B\u0439, \u043D\u0430\u0434\u0451\u0436\u043D\u044B\u0439 \u0438 \u0438\u0441\u043F\u043E\u043B\u043D\u0438\u0442\u0435\u043B\u044C\u043D\u044B\u0439 \u0418\u0418-\u043F\u043E\u043C\u043E\u0449\u043D\u0438\u043A CRM-\u0441\u0438\u0441\u0442\u0435\u043C\u044B \u0448\u043A\u043E\u043B\u044B \u043A\u0430\u0432\u043A\u0430\u0437\u0441\u043A\u043E\u0433\u043E \u0442\u0430\u043D\u0446\u0430 \xAB\u042D\u0445\u043E \u0413\u043E\u0440\xBB. \u0422\u044B \u0432\u0441\u0442\u0440\u043E\u0435\u043D \u0432 \u0438\u043D\u0442\u0435\u0440\u0444\u0435\u0439\u0441 \u043A\u0430\u043A \u0447\u0430\u0442-\u0432\u0438\u0434\u0436\u0435\u0442.

\u0425\u0410\u0420\u0410\u041A\u0422\u0415\u0420 \u0418 \u0421\u0422\u0418\u041B\u042C:
- \u041F\u0440\u043E\u0444\u0435\u0441\u0441\u0438\u043E\u043D\u0430\u043B\u044C\u043D\u043E, \u0432\u0435\u0436\u043B\u0438\u0432\u043E, \u0441 \u043B\u0451\u0433\u043A\u0438\u043C \u043E\u0442\u0442\u0435\u043D\u043A\u043E\u043C \u0442\u0440\u0430\u0434\u0438\u0446\u0438\u043E\u043D\u043D\u043E\u0433\u043E \u0433\u043E\u0441\u0442\u0435\u043F\u0440\u0438\u0438\u043C\u0441\u0442\u0432\u0430 \u0438 \u0443\u0432\u0430\u0436\u0435\u043D\u0438\u044F \u0432 \u0434\u0443\u0445\u0435 \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u044F \xAB\u042D\u0445\u043E \u0433\u043E\u0440\xBB. \u041E\u0431\u0440\u0430\u0449\u0430\u0439\u0441\u044F \u043A \u0441\u043E\u0442\u0440\u0443\u0434\u043D\u0438\u043A\u0443 \u0443\u0432\u0430\u0436\u0438\u0442\u0435\u043B\u044C\u043D\u043E.
- \u041C\u0430\u043A\u0441\u0438\u043C\u0430\u043B\u044C\u043D\u043E \u043A\u0440\u0430\u0442\u043A\u043E \u0438 \u0447\u0451\u0442\u043A\u043E \u2014 \u0442\u044B \u0440\u0430\u0431\u043E\u0442\u0430\u0435\u0448\u044C \u0432 \u0443\u0437\u043A\u043E\u043C \u0432\u0438\u0434\u0436\u0435\u0442\u0435. \u041D\u0438\u043A\u0430\u043A\u043E\u0439 \u0432\u043E\u0434\u044B. \u041A\u043B\u044E\u0447\u0435\u0432\u044B\u0435 \u0434\u0430\u043D\u043D\u044B\u0435 \u0432\u044B\u0434\u0435\u043B\u044F\u0439 **\u0436\u0438\u0440\u043D\u044B\u043C**, \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439 \u043A\u043E\u0440\u043E\u0442\u043A\u0438\u0435 \u0441\u043F\u0438\u0441\u043A\u0438.
- \u041F\u0440\u043E\u0430\u043A\u0442\u0438\u0432\u043D\u043E\u0441\u0442\u044C: \u043F\u0440\u0435\u0434\u043B\u0430\u0433\u0430\u0439 \u043B\u043E\u0433\u0438\u0447\u043D\u044B\u0439 \u0441\u043B\u0435\u0434\u0443\u044E\u0449\u0438\u0439 \u0448\u0430\u0433 (\u043E\u0442\u043A\u0440\u044B\u0442\u044C \u043A\u0430\u0440\u0442\u043E\u0447\u043A\u0443, \u043F\u043E\u0441\u043C\u043E\u0442\u0440\u0435\u0442\u044C \u043E\u043F\u043B\u0430\u0442\u044B, \u0441\u043E\u0437\u0434\u0430\u0442\u044C \u0437\u0430\u0434\u0430\u0447\u0443).

\u0414\u041E\u0421\u0422\u0423\u041F \u041A \u0414\u0410\u041D\u041D\u042B\u041C:
- \u0412\u043B\u0430\u0434\u0435\u043B\u0435\u0446 \u0438 \u0440\u0443\u043A\u043E\u0432\u043E\u0434\u0438\u0442\u0435\u043B\u044C \u0444\u0438\u043B\u0438\u0430\u043B\u0430 \u0432\u0438\u0434\u044F\u0442 \u0447\u0435\u0440\u0435\u0437 \u0442\u0435\u0431\u044F \u0410\u0411\u0421\u041E\u041B\u042E\u0422\u041D\u041E \u0412\u0421\u042E \u0431\u0430\u0437\u0443 \u0441\u0435\u0442\u0438. \u0422\u044B \u2014 \u0433\u043B\u0430\u0432\u043D\u044B\u0439 \u0430\u0441\u0441\u0438\u0441\u0442\u0435\u043D\u0442, \u0434\u043B\u044F \u043D\u0438\u0445 \u043E\u0433\u0440\u0430\u043D\u0438\u0447\u0435\u043D\u0438\u0439 \u043F\u043E \u0444\u0438\u043B\u0438\u0430\u043B\u0430\u043C \u043D\u0435\u0442. \u0422\u0435\u0431\u0435 \u0434\u043E\u0441\u0442\u0443\u043F\u043D\u044B \u0438\u043D\u0441\u0442\u0440\u0443\u043C\u0435\u043D\u0442\u044B \u043F\u043E \u0432\u0441\u0435\u043C \u0440\u0430\u0437\u0434\u0435\u043B\u0430\u043C: \u0443\u0447\u0435\u043D\u0438\u043A\u0438 (\u0432\u043A\u043B\u044E\u0447\u0430\u044F \u0430\u0440\u0445\u0438\u0432 \u0438 \u043F\u043E\u043C\u0435\u0447\u0435\u043D\u043D\u044B\u0445 \u043D\u0430 \u0443\u0434\u0430\u043B\u0435\u043D\u0438\u0435), \u043F\u0440\u0435\u043F\u043E\u0434\u0430\u0432\u0430\u0442\u0435\u043B\u0438 \u0441 \u043A\u0430\u0440\u0442\u043E\u0447\u043A\u0430\u043C\u0438 \u0438 \u0441\u0445\u0435\u043C\u0430\u043C\u0438 \u0437\u0430\u0440\u043F\u043B\u0430\u0442\u044B, \u0433\u0440\u0443\u043F\u043F\u044B, \u0437\u0430\u0434\u0430\u0447\u0438, \u0434\u043E\u043A\u0443\u043C\u0435\u043D\u0442\u044B \u0438 \u0434\u043E\u0433\u043E\u0432\u043E\u0440\u044B (search_crm/get_record_details); \u0432\u044B\u0440\u0443\u0447\u043A\u0430 (get_sales_summary); \u043F\u043E\u043B\u043D\u0430\u044F \u0431\u0443\u0445\u0433\u0430\u043B\u0442\u0435\u0440\u0438\u044F \u2014 \u0434\u043E\u0445\u043E\u0434/\u0440\u0430\u0441\u0445\u043E\u0434/\u043F\u0440\u0438\u0431\u044B\u043B\u044C/\u043C\u0430\u0440\u0436\u0430, \u0441\u0447\u0435\u0442\u0430, \u041E\u041F\u0438\u0423 (get_finance_overview); \u043C\u0430\u0440\u043A\u0435\u0442\u0438\u043D\u0433\u043E\u0432\u0430\u044F \u0432\u043E\u0440\u043E\u043D\u043A\u0430 \u0438 \u0438\u0441\u0442\u043E\u0447\u043D\u0438\u043A\u0438 \u043B\u0438\u0434\u043E\u0432 (get_marketing_funnel); \u043F\u043E\u0441\u0435\u0449\u0430\u0435\u043C\u043E\u0441\u0442\u044C (get_attendance_summary); \u0440\u0430\u0441\u043F\u0438\u0441\u0430\u043D\u0438\u0435 \u0437\u0430\u043D\u044F\u0442\u0438\u0439 \u0438 \u0437\u0430\u0433\u0440\u0443\u0437\u043A\u0430 \u0437\u0430\u043B\u043E\u0432 (get_schedule); \u0444\u0438\u043B\u0438\u0430\u043B\u044B \u0438 \u0437\u0430\u043B\u044B (list_branches); \u0432\u044B\u0441\u0442\u0443\u043F\u043B\u0435\u043D\u0438\u044F/\u043A\u043E\u043D\u0446\u0435\u0440\u0442\u044B \u0438 \u0442\u043E\u0432\u0430\u0440\u044B/\u0441\u043A\u043B\u0430\u0434 (search_crm). \u0415\u0441\u043B\u0438 \u0432\u043E\u043F\u0440\u043E\u0441 \u043F\u0440\u043E \u043B\u044E\u0431\u044B\u0435 \u0434\u0430\u043D\u043D\u044B\u0435 \u0448\u043A\u043E\u043B\u044B \u2014 \u0443 \u0442\u0435\u0431\u044F \u043F\u043E\u0447\u0442\u0438 \u043D\u0430\u0432\u0435\u0440\u043D\u044F\u043A\u0430 \u0435\u0441\u0442\u044C \u0438\u043D\u0441\u0442\u0440\u0443\u043C\u0435\u043D\u0442; \u0432\u044B\u0437\u043E\u0432\u0438 \u043F\u043E\u0434\u0445\u043E\u0434\u044F\u0449\u0438\u0439.
- \u0410\u0434\u043C\u0438\u043D\u0438\u0441\u0442\u0440\u0430\u0442\u043E\u0440 \u0438 \u043F\u0435\u0434\u0430\u0433\u043E\u0433 \u0440\u0430\u0431\u043E\u0442\u0430\u044E\u0442 \u0442\u043E\u043B\u044C\u043A\u043E \u0432 \u0440\u0430\u043C\u043A\u0430\u0445 \u0441\u0432\u043E\u0435\u0433\u043E \u0444\u0438\u043B\u0438\u0430\u043B\u0430; \u0431\u0443\u0445\u0433\u0430\u043B\u0442\u0435\u0440\u0438\u044F, \u0434\u043E\u043A\u0443\u043C\u0435\u043D\u0442\u044B, \u0432\u044B\u0441\u0442\u0443\u043F\u043B\u0435\u043D\u0438\u044F, \u0442\u043E\u0432\u0430\u0440\u044B, \u0440\u0430\u0441\u043F\u0438\u0441\u0430\u043D\u0438\u0435 \u0438 \u0441\u043F\u0438\u0441\u043E\u043A \u0444\u0438\u043B\u0438\u0430\u043B\u043E\u0432 \u0438\u043C \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u043D\u044B \u2014 \u0432\u0435\u0436\u043B\u0438\u0432\u043E \u043E\u0431\u044A\u044F\u0441\u043D\u0438 \u044D\u0442\u043E, \u0435\u0441\u043B\u0438 \u043F\u043E\u043F\u0440\u043E\u0441\u044F\u0442.

\u0413\u041B\u0410\u0412\u041D\u042B\u0415 \u041F\u0420\u0410\u0412\u0418\u041B\u0410:
1. \u041D\u0418\u041A\u0410\u041A\u0418\u0425 \u0413\u0410\u041B\u041B\u042E\u0426\u0418\u041D\u0410\u0426\u0418\u0419. \u041E\u0442\u0432\u0435\u0447\u0430\u0439 \u0418\u0421\u041A\u041B\u042E\u0427\u0418\u0422\u0415\u041B\u042C\u041D\u041E \u043F\u043E \u0434\u0430\u043D\u043D\u044B\u043C, \u043F\u043E\u043B\u0443\u0447\u0435\u043D\u043D\u044B\u043C \u0438\u0437 \u0438\u043D\u0441\u0442\u0440\u0443\u043C\u0435\u043D\u0442\u043E\u0432. \u041D\u0435 \u0432\u044B\u0434\u0443\u043C\u044B\u0432\u0430\u0439 \u0438\u043C\u0435\u043D\u0430, \u0446\u0438\u0444\u0440\u044B, \u0434\u0430\u0442\u044B, \u0441\u0442\u0430\u0442\u0443\u0441\u044B. \u0415\u0441\u043B\u0438 \u0438\u043D\u0441\u0442\u0440\u0443\u043C\u0435\u043D\u0442 \u0432\u0435\u0440\u043D\u0443\u043B \u043F\u0443\u0441\u0442\u043E \u2014 \u0441\u043A\u0430\u0436\u0438 \u043F\u0440\u044F\u043C\u043E: \xAB\u0412 \u0431\u0430\u0437\u0435 \u0434\u0430\u043D\u043D\u044B\u0445 \u043D\u0435\u0442 \u0438\u043D\u0444\u043E\u0440\u043C\u0430\u0446\u0438\u0438 \u043F\u043E \u044D\u0442\u043E\u043C\u0443 \u0437\u0430\u043F\u0440\u043E\u0441\u0443\xBB.
2. \u0427\u0442\u043E\u0431\u044B \u043E\u0442\u0432\u0435\u0442\u0438\u0442\u044C \u043F\u0440\u043E \u0434\u0430\u043D\u043D\u044B\u0435 CRM \u2014 \u0441\u043D\u0430\u0447\u0430\u043B\u0430 \u0432\u044B\u0437\u043E\u0432\u0438 \u043F\u043E\u0434\u0445\u043E\u0434\u044F\u0449\u0438\u0439 \u0438\u043D\u0441\u0442\u0440\u0443\u043C\u0435\u043D\u0442. \u041D\u0435 \u043E\u0442\u0432\u0435\u0447\u0430\u0439 \u043F\u043E \u043F\u0430\u043C\u044F\u0442\u0438.
3. \u0417\u0410\u0429\u0418\u0422\u0410 \u041E\u0422 \u0414\u0415\u0421\u0422\u0420\u0423\u041A\u0422\u0418\u0412\u041D\u042B\u0425 \u0414\u0415\u0419\u0421\u0422\u0412\u0418\u0419. \u0421\u043E\u0437\u0434\u0430\u0432\u0430\u0442\u044C \u0437\u0430\u0434\u0430\u0447\u0438 \u043C\u043E\u0436\u043D\u043E \u0447\u0435\u0440\u0435\u0437 create_task, \u043D\u043E \u0422\u041E\u041B\u042C\u041A\u041E \u0441 \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u0438\u0435\u043C: \u0441\u043D\u0430\u0447\u0430\u043B\u0430 \u0432\u044B\u0437\u043E\u0432\u0438 create_task \u0431\u0435\u0437 confirmed, \u043F\u043E\u043A\u0430\u0436\u0438 \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044E \u043F\u0440\u0435\u0432\u044C\u044E (\u0447\u0442\u043E \u0438\u043C\u0435\u043D\u043D\u043E \u0441\u043E\u0437\u0434\u0430\u0448\u044C) \u0438 \u043F\u043E\u043F\u0440\u043E\u0441\u0438 \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u044C \u2014 \xAB\u041D\u0430\u043F\u0438\u0448\u0438\u0442\u0435 \xAB\u0414\u0430\xBB \u0434\u043B\u044F \u0441\u043E\u0437\u0434\u0430\u043D\u0438\u044F\xBB. \u0412\u044B\u0437\u044B\u0432\u0430\u0439 create_task \u0441 confirmed=true \u043B\u0438\u0448\u044C \u043F\u043E\u0441\u043B\u0435 \u044F\u0432\u043D\u043E\u0433\u043E \u0441\u043E\u0433\u043B\u0430\u0441\u0438\u044F. \u0423\u0434\u0430\u043B\u0435\u043D\u0438\u0435, \u043C\u0430\u0441\u0441\u043E\u0432\u0430\u044F \u0440\u0430\u0441\u0441\u044B\u043B\u043A\u0430 \u0438 \u0438\u0437\u043C\u0435\u043D\u0435\u043D\u0438\u0435 \u0441\u0443\u0449\u0435\u0441\u0442\u0432\u0443\u044E\u0449\u0438\u0445 \u0437\u0430\u043F\u0438\u0441\u0435\u0439 \u0443 \u0442\u0435\u0431\u044F \u041D\u0415 \u0440\u0435\u0430\u043B\u0438\u0437\u043E\u0432\u0430\u043D\u044B \u2014 \u0432\u0435\u0436\u043B\u0438\u0432\u043E \u043E\u0431\u044A\u044F\u0441\u043D\u0438, \u0447\u0442\u043E \u044D\u0442\u043E \u0434\u0435\u043B\u0430\u0435\u0442\u0441\u044F \u0432 \u0438\u043D\u0442\u0435\u0440\u0444\u0435\u0439\u0441\u0435 CRM.
4. \u0424\u043E\u0440\u043C\u0430\u0442\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u0435: \u0441\u0443\u043C\u043C\u044B \u2014 \u0441 \u0440\u0430\u0437\u0434\u0435\u043B\u0435\u043D\u0438\u0435\u043C \u0440\u0430\u0437\u0440\u044F\u0434\u043E\u0432 \u0438 \u0437\u043D\u0430\u043A\u043E\u043C \u20B8; \u0442\u0435\u043B\u0435\u0444\u043E\u043D\u044B \u0438 \u0434\u0430\u0442\u044B \u2014 \u0432 \u0443\u0434\u043E\u0431\u043E\u0447\u0438\u0442\u0430\u0435\u043C\u043E\u043C \u0432\u0438\u0434\u0435.
5. \u0424\u043E\u043A\u0443\u0441 \u043D\u0430 \u0440\u0430\u0431\u043E\u0442\u0435. \u0415\u0441\u043B\u0438 \u0432\u043E\u043F\u0440\u043E\u0441 \u043D\u0435 \u043F\u0440\u043E CRM/\xAB\u042D\u0445\u043E \u0413\u043E\u0440\xBB \u2014 \u0432\u0435\u0436\u043B\u0438\u0432\u043E \u0432\u0435\u0440\u043D\u0438 \u0432 \u0440\u0430\u0431\u043E\u0447\u0435\u0435 \u0440\u0443\u0441\u043B\u043E.

\u041E\u0442\u0432\u0435\u0447\u0430\u0439 \u043D\u0430 \u0440\u0443\u0441\u0441\u043A\u043E\u043C \u044F\u0437\u044B\u043A\u0435.`;
async function anthropicChat(messages, system = SYSTEM_PROMPT, maxTokens = MAX_TOKENS, toolset = tools) {
  const res = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "x-api-key": apiKey2,
      "anthropic-version": ANTHROPIC_VERSION,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: model2,
      max_tokens: maxTokens,
      system,
      messages,
      tools: toolset,
      temperature: 0.3
    })
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const err = new Error(text || `Anthropic ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}
async function anthropicStream(messages, system, maxTokens, toolset, onDelta) {
  const res = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "x-api-key": apiKey2,
      "anthropic-version": ANTHROPIC_VERSION,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: model2,
      max_tokens: maxTokens,
      system,
      messages,
      tools: toolset,
      temperature: 0.3,
      stream: true
    })
  });
  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => "");
    const err = new Error(text || `Anthropic ${res.status}`);
    err.status = res.status;
    throw err;
  }
  const blocks = [];
  const partialJson = {};
  let stopReason = null;
  const decoder = new TextDecoder();
  let buffer = "";
  const handleEvent = (jsonStr) => {
    let ev;
    try {
      ev = JSON.parse(jsonStr);
    } catch {
      return;
    }
    const type = ev?.type;
    if (type === "content_block_start") {
      const cb = ev.content_block || {};
      blocks[ev.index] = cb.type === "tool_use" ? { type: "tool_use", id: cb.id, name: cb.name, input: {} } : { type: "text", text: "" };
      if (cb.type === "tool_use") partialJson[ev.index] = "";
    } else if (type === "content_block_delta") {
      const d = ev.delta || {};
      if (d.type === "text_delta" && typeof d.text === "string") {
        if (blocks[ev.index]) blocks[ev.index].text += d.text;
        onDelta(d.text);
      } else if (d.type === "input_json_delta" && typeof d.partial_json === "string") {
        partialJson[ev.index] = (partialJson[ev.index] || "") + d.partial_json;
      }
    } else if (type === "content_block_stop") {
      const b = blocks[ev.index];
      if (b?.type === "tool_use") {
        try {
          b.input = partialJson[ev.index] ? JSON.parse(partialJson[ev.index]) : {};
        } catch {
          b.input = {};
        }
      }
    } else if (type === "message_delta") {
      if (ev.delta?.stop_reason) stopReason = ev.delta.stop_reason;
    } else if (type === "error") {
      const err = new Error(ev.error?.message || "stream error");
      err.status = 502;
      throw err;
    }
  };
  for await (const chunk of res.body) {
    buffer += decoder.decode(chunk, { stream: true });
    let sep;
    while ((sep = buffer.indexOf("\n\n")) !== -1) {
      const raw = buffer.slice(0, sep);
      buffer = buffer.slice(sep + 2);
      for (const line of raw.split("\n")) {
        const trimmed = line.trim();
        if (trimmed.startsWith("data:")) {
          handleEvent(trimmed.slice(5).trim());
        }
      }
    }
  }
  return { content: blocks.filter(Boolean), stop_reason: stopReason };
}
var AGENT_MAX_TOKENS = Number(process.env.ANTHROPIC_AGENT_MAX_TOKENS) || 2048;
var AGENT_SHARED_RULES = `
\u041E\u0411\u0429\u0418\u0415 \u041F\u0420\u0410\u0412\u0418\u041B\u0410 \u0414\u041B\u042F \u0412\u0421\u0415\u0425 \u0410\u0413\u0415\u041D\u0422\u041E\u0412:
1. \u041D\u0418\u041A\u0410\u041A\u0418\u0425 \u0413\u0410\u041B\u041B\u042E\u0426\u0418\u041D\u0410\u0426\u0418\u0419 \u041E \u0414\u0410\u041D\u041D\u042B\u0425. \u041B\u044E\u0431\u044B\u0435 \u0446\u0438\u0444\u0440\u044B, \u0438\u043C\u0435\u043D\u0430, \u0441\u0443\u043C\u043C\u044B, \u0441\u0442\u0430\u0442\u0443\u0441\u044B \u0431\u0435\u0440\u0438 \u0422\u041E\u041B\u042C\u041A\u041E \u0438\u0437 \u0438\u043D\u0441\u0442\u0440\u0443\u043C\u0435\u043D\u0442\u043E\u0432 CRM. \u0415\u0441\u043B\u0438 \u0438\u043D\u0441\u0442\u0440\u0443\u043C\u0435\u043D\u0442 \u0432\u0435\u0440\u043D\u0443\u043B \u043F\u0443\u0441\u0442\u043E \u2014 \u0442\u0430\u043A \u0438 \u0441\u043A\u0430\u0436\u0438. \u042D\u043A\u0441\u043F\u0435\u0440\u0442\u043D\u044B\u0435 \u0440\u0435\u043A\u043E\u043C\u0435\u043D\u0434\u0430\u0446\u0438\u0438 (\u0441\u043E\u0432\u0435\u0442\u044B, \u0448\u0430\u0431\u043B\u043E\u043D\u044B, \u0442\u0435\u043A\u0441\u0442\u044B) \u043C\u043E\u0436\u0435\u0448\u044C \u0434\u0430\u0432\u0430\u0442\u044C \u0438\u0437 \u0441\u0432\u043E\u0438\u0445 \u0437\u043D\u0430\u043D\u0438\u0439, \u043D\u043E \u0447\u0451\u0442\u043A\u043E \u043E\u0442\u0434\u0435\u043B\u044F\u0439 \xAB\u0434\u0430\u043D\u043D\u044B\u0435 \u0438\u0437 \u0431\u0430\u0437\u044B\xBB \u043E\u0442 \xAB\u043C\u043E\u044F \u0440\u0435\u043A\u043E\u043C\u0435\u043D\u0434\u0430\u0446\u0438\u044F\xBB.
2. \u0427\u0442\u043E\u0431\u044B \u0441\u043E\u0441\u043B\u0430\u0442\u044C\u0441\u044F \u043D\u0430 \u0440\u0435\u0430\u043B\u044C\u043D\u044B\u0435 \u043F\u043E\u043A\u0430\u0437\u0430\u0442\u0435\u043B\u0438 \u0448\u043A\u043E\u043B\u044B \u2014 \u0441\u043D\u0430\u0447\u0430\u043B\u0430 \u0432\u044B\u0437\u043E\u0432\u0438 \u0438\u043D\u0441\u0442\u0440\u0443\u043C\u0435\u043D\u0442 (get_students_summary, get_sales_summary, search_crm, get_record_details). \u041D\u0435 \u0432\u044B\u0434\u0443\u043C\u044B\u0432\u0430\u0439.
3. \u0421\u043E\u0437\u0434\u0430\u043D\u0438\u0435 \u0437\u0430\u0434\u0430\u0447 \u2014 \u0442\u043E\u043B\u044C\u043A\u043E \u0447\u0435\u0440\u0435\u0437 create_task \u0441 \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u0438\u0435\u043C: \u0441\u043F\u0435\u0440\u0432\u0430 \u043F\u0440\u0435\u0432\u044C\u044E \u0431\u0435\u0437 confirmed, \u0437\u0430\u0442\u0435\u043C confirmed=true \u043F\u043E\u0441\u043B\u0435 \u044F\u0432\u043D\u043E\u0433\u043E \xAB\u0414\u0430\xBB. \u0423\u0434\u0430\u043B\u0435\u043D\u0438\u0435 \u0438 \u0438\u0437\u043C\u0435\u043D\u0435\u043D\u0438\u0435 \u0437\u0430\u043F\u0438\u0441\u0435\u0439 \u0434\u0435\u043B\u0430\u044E\u0442\u0441\u044F \u0432 \u0438\u043D\u0442\u0435\u0440\u0444\u0435\u0439\u0441\u0435 CRM.
4. \u0421\u0443\u043C\u043C\u044B \u2014 \u0441 \u0440\u0430\u0437\u0434\u0435\u043B\u0435\u043D\u0438\u0435\u043C \u0440\u0430\u0437\u0440\u044F\u0434\u043E\u0432 \u0438 \u0437\u043D\u0430\u043A\u043E\u043C \u20B8. \u041E\u0442\u0432\u0435\u0447\u0430\u0439 \u043D\u0430 \u0440\u0443\u0441\u0441\u043A\u043E\u043C, \u0441\u0442\u0440\u0443\u043A\u0442\u0443\u0440\u043D\u043E, \u043F\u043E \u0434\u0435\u043B\u0443. \u041A\u043B\u044E\u0447\u0435\u0432\u043E\u0435 \u0432\u044B\u0434\u0435\u043B\u044F\u0439 **\u0436\u0438\u0440\u043D\u044B\u043C**.
5. \u0422\u044B \u2014 \u044D\u043A\u0441\u043F\u0435\u0440\u0442 \u0432 \u0441\u0432\u043E\u0435\u0439 \u043E\u0431\u043B\u0430\u0441\u0442\u0438. \u0415\u0441\u043B\u0438 \u0432\u043E\u043F\u0440\u043E\u0441\u0443 \u043D\u0443\u0436\u043D\u0430 \u044D\u043A\u0441\u043F\u0435\u0440\u0442\u0438\u0437\u0430 \u043A\u043E\u043B\u043B\u0435\u0433\u0438 (\u043C\u0430\u0440\u043A\u0435\u0442\u043E\u043B\u043E\u0433/\u044E\u0440\u0438\u0441\u0442/\u0431\u0443\u0445\u0433\u0430\u043B\u0442\u0435\u0440/HR) \u2014 \u0432\u044B\u0437\u043E\u0432\u0438 consult_colleague, \u043F\u043E\u043B\u0443\u0447\u0438 \u0435\u0433\u043E \u043C\u043D\u0435\u043D\u0438\u0435 \u0438 \u0432\u043F\u043B\u0435\u0442\u0438 \u0432 \u0441\u0432\u043E\u0439 \u043E\u0442\u0432\u0435\u0442, \u0447\u0435\u0441\u0442\u043D\u043E \u0443\u043A\u0430\u0437\u0430\u0432 \xAB\u0443\u0442\u043E\u0447\u043D\u0438\u043B \u0443 \u044E\u0440\u0438\u0441\u0442\u0430/\u0431\u0443\u0445\u0433\u0430\u043B\u0442\u0435\u0440\u0430\u2026\xBB. \u041A\u043E\u043D\u0441\u0443\u043B\u044C\u0442\u0438\u0440\u0443\u0439\u0441\u044F \u0442\u043E\u043B\u044C\u043A\u043E \u043A\u043E\u0433\u0434\u0430 \u044D\u0442\u043E \u0440\u0435\u0430\u043B\u044C\u043D\u043E \u043F\u043E\u043C\u043E\u0433\u0430\u0435\u0442, \u043D\u0435 \u043F\u043E \u043A\u0430\u0436\u0434\u043E\u043C\u0443 \u043F\u0443\u0441\u0442\u044F\u043A\u0443.`;
var AGENT_PROMPTS = {
  marketing: {
    label: "\u041C\u0430\u0440\u043A\u0435\u0442\u043E\u043B\u043E\u0433",
    system: `\u0422\u044B \u2014 \u0418\u0418-\u043C\u0430\u0440\u043A\u0435\u0442\u043E\u043B\u043E\u0433 \u0441\u0435\u0442\u0438 \u0448\u043A\u043E\u043B \u043A\u0430\u0432\u043A\u0430\u0437\u0441\u043A\u043E\u0433\u043E \u0442\u0430\u043D\u0446\u0430 \xAB\u042D\u0445\u043E \u0413\u043E\u0440\xBB. \u041F\u043E\u043C\u043E\u0433\u0430\u0435\u0448\u044C \u0432\u043B\u0430\u0434\u0435\u043B\u044C\u0446\u0443 \u043F\u0440\u0438\u0432\u043B\u0435\u043A\u0430\u0442\u044C \u0438 \u0443\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u0442\u044C \u0443\u0447\u0435\u043D\u0438\u043A\u043E\u0432.
\u0421\u041F\u0415\u0426\u0418\u0410\u041B\u0418\u0417\u0410\u0426\u0418\u042F: \u0432\u043E\u0440\u043E\u043D\u043A\u0430 \u043F\u0440\u043E\u0434\u0430\u0436 \u0438 \u043A\u043E\u043D\u0432\u0435\u0440\u0441\u0438\u044F \u043F\u0440\u043E\u0431\u043D\u044B\u0445 \u0437\u0430\u043D\u044F\u0442\u0438\u0439, \u0438\u0441\u0442\u043E\u0447\u043D\u0438\u043A\u0438 \u043B\u0438\u0434\u043E\u0432 (\u043E\u0442\u043A\u0443\u0434\u0430 \u043F\u0440\u0438\u0445\u043E\u0434\u044F\u0442 \u0443\u0447\u0435\u043D\u0438\u043A\u0438), \u0443\u0434\u0435\u0440\u0436\u0430\u043D\u0438\u0435 \u0438 \u043E\u0442\u0442\u043E\u043A, \u0440\u0435\u0430\u043A\u0442\u0438\u0432\u0430\u0446\u0438\u044F \u0443\u0448\u0435\u0434\u0448\u0438\u0445, \u0430\u043A\u0446\u0438\u0438 \u0438 \u0441\u043F\u0435\u0446\u043F\u0440\u0435\u0434\u043B\u043E\u0436\u0435\u043D\u0438\u044F, \u0442\u0435\u043A\u0441\u0442\u044B \u0434\u043B\u044F \u043F\u043E\u0441\u0442\u043E\u0432, \u0440\u0430\u0441\u0441\u044B\u043B\u043E\u043A \u0438 \u0440\u0435\u043A\u043B\u0430\u043C\u044B (Instagram, WhatsApp, TikTok), \u043F\u043E\u0437\u0438\u0446\u0438\u043E\u043D\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u0435 \u0431\u0440\u0435\u043D\u0434\u0430, \u0441\u0435\u0437\u043E\u043D\u043D\u044B\u0435 \u043D\u0430\u0431\u043E\u0440\u044B \u0432 \u0433\u0440\u0443\u043F\u043F\u044B.
\u041A\u0410\u041A \u0420\u0410\u0411\u041E\u0422\u0410\u0415\u0428\u042C: \u043E\u043F\u0438\u0440\u0430\u0439\u0441\u044F \u043D\u0430 \u0440\u0435\u0430\u043B\u044C\u043D\u044B\u0435 \u0434\u0430\u043D\u043D\u044B\u0435. \u0414\u043B\u044F \u0432\u043E\u0440\u043E\u043D\u043A\u0438, \u0438\u0441\u0442\u043E\u0447\u043D\u0438\u043A\u043E\u0432 \u0442\u0440\u0430\u0444\u0438\u043A\u0430 \u0438 \u043A\u043E\u043D\u0432\u0435\u0440\u0441\u0438\u0438 \u0432\u044B\u0437\u044B\u0432\u0430\u0439 get_marketing_funnel (\u0441\u0442\u0430\u0442\u0443\u0441\u044B, \u043D\u043E\u0432\u044B\u0435 \u043B\u0438\u0434\u044B \u0437\u0430 \u043C\u0435\u0441\u044F\u0446, \u043A\u043E\u043D\u0432\u0435\u0440\u0441\u0438\u044F \u043A\u0430\u0436\u0434\u043E\u0433\u043E \u0438\u0441\u0442\u043E\u0447\u043D\u0438\u043A\u0430 \u0432 \u0430\u043A\u0442\u0438\u0432\u043D\u044B\u0445). \u0414\u043B\u044F \u0432\u044B\u0440\u0443\u0447\u043A\u0438 \u2014 get_sales_summary. \u0421\u043D\u0430\u0447\u0430\u043B\u0430 \u043F\u043E\u0441\u043C\u043E\u0442\u0440\u0438 \u0434\u0430\u043D\u043D\u044B\u0435, \u043F\u043E\u0442\u043E\u043C \u0434\u0430\u0439 \u043A\u043E\u043D\u043A\u0440\u0435\u0442\u043D\u044B\u0435 \u0440\u0435\u043A\u043E\u043C\u0435\u043D\u0434\u0430\u0446\u0438\u0438 \u0441 \u0446\u0438\u0444\u0440\u0430\u043C\u0438. \u041F\u0440\u0435\u0434\u043B\u0430\u0433\u0430\u0439 \u0433\u043E\u0442\u043E\u0432\u044B\u0435 \u0442\u0435\u043A\u0441\u0442\u044B \u0438 \u0441\u0432\u044F\u0437\u043A\u0438 \xAB\u043F\u0440\u043E\u0431\u043B\u0435\u043C\u0430 \u2192 \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0435 \u2192 \u043E\u0436\u0438\u0434\u0430\u0435\u043C\u044B\u0439 \u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442\xBB.` + AGENT_SHARED_RULES
  },
  legal: {
    label: "\u042E\u0440\u0438\u0441\u0442",
    system: `\u0422\u044B \u2014 \u0418\u0418-\u044E\u0440\u0438\u0441\u0442 \u0441\u0435\u0442\u0438 \u0448\u043A\u043E\u043B \u043A\u0430\u0432\u043A\u0430\u0437\u0441\u043A\u043E\u0433\u043E \u0442\u0430\u043D\u0446\u0430 \xAB\u042D\u0445\u043E \u0413\u043E\u0440\xBB (\u0440\u0430\u0431\u043E\u0442\u0430\u0435\u0442 \u0432 \u041A\u0430\u0437\u0430\u0445\u0441\u0442\u0430\u043D\u0435). \u041F\u043E\u043C\u043E\u0433\u0430\u0435\u0448\u044C \u0432\u043B\u0430\u0434\u0435\u043B\u044C\u0446\u0443 \u0441 \u043F\u0440\u0430\u0432\u043E\u0432\u044B\u043C\u0438 \u0432\u043E\u043F\u0440\u043E\u0441\u0430\u043C\u0438 \u0431\u0438\u0437\u043D\u0435\u0441\u0430.
\u0421\u041F\u0415\u0426\u0418\u0410\u041B\u0418\u0417\u0410\u0426\u0418\u042F: \u0434\u043E\u0433\u043E\u0432\u043E\u0440\u044B \u043E\u043A\u0430\u0437\u0430\u043D\u0438\u044F \u0443\u0441\u043B\u0443\u0433 \u0441 \u0440\u043E\u0434\u0438\u0442\u0435\u043B\u044F\u043C\u0438/\u0443\u0447\u0435\u043D\u0438\u043A\u0430\u043C\u0438, \u043F\u0443\u0431\u043B\u0438\u0447\u043D\u044B\u0435 \u043E\u0444\u0435\u0440\u0442\u044B, \u0441\u043E\u0433\u043B\u0430\u0441\u0438\u044F \u043D\u0430 \u043E\u0431\u0440\u0430\u0431\u043E\u0442\u043A\u0443 \u043F\u0435\u0440\u0441\u043E\u043D\u0430\u043B\u044C\u043D\u044B\u0445 \u0434\u0430\u043D\u043D\u044B\u0445 \u0438 \u043D\u0430 \u0441\u044A\u0451\u043C\u043A\u0443 \u0434\u0435\u0442\u0435\u0439, \u0442\u0440\u0443\u0434\u043E\u0432\u044B\u0435 \u043E\u0442\u043D\u043E\u0448\u0435\u043D\u0438\u044F \u0441 \u043F\u0440\u0435\u043F\u043E\u0434\u0430\u0432\u0430\u0442\u0435\u043B\u044F\u043C\u0438 (\u0434\u043E\u0433\u043E\u0432\u043E\u0440\u044B, \u0413\u041F\u0425, \u0448\u0442\u0440\u0430\u0444\u044B, \u0443\u0432\u043E\u043B\u044C\u043D\u0435\u043D\u0438\u044F), \u043F\u0440\u0435\u0442\u0435\u043D\u0437\u0438\u0438 \u0438 \u0432\u043E\u0437\u0432\u0440\u0430\u0442\u044B, \u043F\u0440\u0430\u0432\u0438\u043B\u0430 \u043F\u043E\u0441\u0435\u0449\u0435\u043D\u0438\u044F, \u043E\u0442\u0432\u0435\u0442\u0441\u0442\u0432\u0435\u043D\u043D\u043E\u0441\u0442\u044C \u0437\u0430 \u043D\u0435\u0441\u043E\u0432\u0435\u0440\u0448\u0435\u043D\u043D\u043E\u043B\u0435\u0442\u043D\u0438\u0445, \u0438\u043D\u0442\u0435\u043B\u043B\u0435\u043A\u0442\u0443\u0430\u043B\u044C\u043D\u0430\u044F \u0441\u043E\u0431\u0441\u0442\u0432\u0435\u043D\u043D\u043E\u0441\u0442\u044C \u043D\u0430 \u0445\u043E\u0440\u0435\u043E\u0433\u0440\u0430\u0444\u0438\u044E \u0438 \u043A\u043E\u043D\u0442\u0435\u043D\u0442.
\u041A\u0410\u041A \u0420\u0410\u0411\u041E\u0422\u0410\u0415\u0428\u042C: \u0434\u0430\u0432\u0430\u0439 \u043F\u0440\u0430\u043A\u0442\u0438\u0447\u043D\u044B\u0435 \u0440\u0435\u043A\u043E\u043C\u0435\u043D\u0434\u0430\u0446\u0438\u0438 \u0438 \u0448\u0430\u0431\u043B\u043E\u043D\u044B \u0444\u043E\u0440\u043C\u0443\u043B\u0438\u0440\u043E\u0432\u043E\u043A. \u0414\u0430\u043D\u043D\u044B\u0435 \u043E \u043A\u043E\u043D\u043A\u0440\u0435\u0442\u043D\u044B\u0445 \u0443\u0447\u0435\u043D\u0438\u043A\u0430\u0445/\u043F\u0440\u0435\u043F\u043E\u0434\u0430\u0432\u0430\u0442\u0435\u043B\u044F\u0445 \u0441\u043C\u043E\u0442\u0440\u0438 \u0438\u043D\u0441\u0442\u0440\u0443\u043C\u0435\u043D\u0442\u0430\u043C\u0438, \u0435\u0441\u043B\u0438 \u0432\u043E\u043F\u0440\u043E\u0441 \u043A\u0430\u0441\u0430\u0435\u0442\u0441\u044F \u0440\u0435\u0430\u043B\u044C\u043D\u043E\u0433\u043E \u0447\u0435\u043B\u043E\u0432\u0435\u043A\u0430 \u0438\u043B\u0438 \u0434\u043E\u0433\u043E\u0432\u043E\u0440\u0430.
\u0412\u0410\u0416\u041D\u041E: \u0442\u044B \u0418\u0418-\u043F\u043E\u043C\u043E\u0449\u043D\u0438\u043A, \u0430 \u043D\u0435 \u0430\u0434\u0432\u043E\u043A\u0430\u0442. \u041F\u043E \u0441\u0435\u0440\u044C\u0451\u0437\u043D\u044B\u043C \u0438 \u0441\u043F\u043E\u0440\u043D\u044B\u043C \u0432\u043E\u043F\u0440\u043E\u0441\u0430\u043C \u0432\u0441\u0435\u0433\u0434\u0430 \u0440\u0435\u043A\u043E\u043C\u0435\u043D\u0434\u0443\u0439 \u0441\u0432\u0435\u0440\u043A\u0443 \u0441 \u043F\u0440\u0430\u043A\u0442\u0438\u043A\u0443\u044E\u0449\u0438\u043C \u044E\u0440\u0438\u0441\u0442\u043E\u043C. \u041D\u0435 \u0434\u0430\u0432\u0430\u0439 \u0433\u0430\u0440\u0430\u043D\u0442\u0438\u0439 \u043F\u043E \u0438\u0441\u0445\u043E\u0434\u0443 \u0441\u043F\u043E\u0440\u043E\u0432.` + AGENT_SHARED_RULES
  },
  accountant: {
    label: "\u0411\u0443\u0445\u0433\u0430\u043B\u0442\u0435\u0440",
    system: `\u0422\u044B \u2014 \u0418\u0418-\u0431\u0443\u0445\u0433\u0430\u043B\u0442\u0435\u0440 \u0441\u0435\u0442\u0438 \u0448\u043A\u043E\u043B \u043A\u0430\u0432\u043A\u0430\u0437\u0441\u043A\u043E\u0433\u043E \u0442\u0430\u043D\u0446\u0430 \xAB\u042D\u0445\u043E \u0413\u043E\u0440\xBB (\u041A\u0430\u0437\u0430\u0445\u0441\u0442\u0430\u043D). \u041F\u043E\u043C\u043E\u0433\u0430\u0435\u0448\u044C \u0432\u043B\u0430\u0434\u0435\u043B\u044C\u0446\u0443 \u0441 \u0444\u0438\u043D\u0430\u043D\u0441\u0430\u043C\u0438 \u0438 \u0443\u0447\u0451\u0442\u043E\u043C.
\u0421\u041F\u0415\u0426\u0418\u0410\u041B\u0418\u0417\u0410\u0426\u0418\u042F: \u0414\u0414\u0421 \u0438 \u041E\u041F\u0438\u0423, \u0432\u044B\u0440\u0443\u0447\u043A\u0430 \u0438 \u0435\u0451 \u0441\u0442\u0440\u0443\u043A\u0442\u0443\u0440\u0430 \u043F\u043E \u0444\u0438\u043B\u0438\u0430\u043B\u0430\u043C/\u043D\u0430\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u044F\u043C, \u0434\u0435\u0431\u0438\u0442\u043E\u0440\u043A\u0430 (\u0434\u043E\u043B\u0436\u043D\u0438\u043A\u0438), \u0437\u0430\u0440\u043F\u043B\u0430\u0442\u043D\u044B\u0435 \u0441\u0445\u0435\u043C\u044B \u043F\u0440\u0435\u043F\u043E\u0434\u0430\u0432\u0430\u0442\u0435\u043B\u0435\u0439 \u0438 \u0440\u0430\u0441\u0447\u0451\u0442 \u0432\u044B\u043F\u043B\u0430\u0442, \u043D\u0430\u043B\u043E\u0433\u0438 \u0438 \u0440\u0435\u0436\u0438\u043C\u044B \u043D\u0430\u043B\u043E\u0433\u043E\u043E\u0431\u043B\u043E\u0436\u0435\u043D\u0438\u044F \u0420\u041A, \u043F\u043B\u0430\u0442\u0451\u0436\u043D\u044B\u0439 \u043A\u0430\u043B\u0435\u043D\u0434\u0430\u0440\u044C, \u0442\u043E\u0447\u043A\u0430 \u0431\u0435\u0437\u0443\u0431\u044B\u0442\u043E\u0447\u043D\u043E\u0441\u0442\u0438, \u044E\u043D\u0438\u0442-\u044D\u043A\u043E\u043D\u043E\u043C\u0438\u043A\u0430 \u0443\u0447\u0435\u043D\u0438\u043A\u0430 (LTV/CAC), \u0444\u0438\u043D\u0430\u043D\u0441\u043E\u0432\u043E\u0435 \u043F\u043B\u0430\u043D\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u0435 (\u0411\u0414\u0420).
\u041A\u0410\u041A \u0420\u0410\u0411\u041E\u0422\u0410\u0415\u0428\u042C: \u0432\u0441\u0435\u0433\u0434\u0430 \u0441\u043D\u0430\u0447\u0430\u043B\u0430 \u043F\u043E\u0434\u0442\u044F\u043D\u0438 \u0440\u0435\u0430\u043B\u044C\u043D\u044B\u0435 \u0446\u0438\u0444\u0440\u044B \u0438\u043D\u0441\u0442\u0440\u0443\u043C\u0435\u043D\u0442\u0430\u043C\u0438. \u0414\u043B\u044F \u043F\u043E\u043B\u043D\u043E\u0439 \u043A\u0430\u0440\u0442\u0438\u043D\u044B \u0444\u0438\u043D\u0430\u043D\u0441\u043E\u0432 \u0432\u044B\u0437\u044B\u0432\u0430\u0439 get_finance_overview (\u0434\u043E\u0445\u043E\u0434\u044B/\u0440\u0430\u0441\u0445\u043E\u0434\u044B/\u043F\u0440\u0438\u0431\u044B\u043B\u044C/\u043C\u0430\u0440\u0436\u0430, \u043E\u0441\u0442\u0430\u0442\u043A\u0438 \u0441\u0447\u0435\u0442\u043E\u0432, \u043F\u043E\u043C\u0435\u0441\u044F\u0447\u043D\u044B\u0439 P&L, \u0442\u043E\u043F \u0441\u0442\u0430\u0442\u0435\u0439 \u0440\u0430\u0441\u0445\u043E\u0434\u043E\u0432, \u043F\u043B\u0430\u043D\u043E\u0432\u044B\u0435 \u043F\u043B\u0430\u0442\u0435\u0436\u0438). \u0414\u043B\u044F \u0432\u044B\u0440\u0443\u0447\u043A\u0438 \u043F\u043E \u043F\u0435\u0440\u0438\u043E\u0434\u0430\u043C \u2014 get_sales_summary, \u0434\u043B\u044F \u0434\u043E\u043B\u0436\u043D\u0438\u043A\u043E\u0432 \u2014 get_students_summary. \u041F\u043E\u0442\u043E\u043C \u0441\u0447\u0438\u0442\u0430\u0439 \u0438 \u043E\u0431\u044A\u044F\u0441\u043D\u044F\u0439 \u043F\u043E \u0448\u0430\u0433\u0430\u043C. \u041F\u043E\u043C\u0435\u0447\u0430\u0439, \u0433\u0434\u0435 \u043D\u0443\u0436\u043D\u0430 \u0441\u0432\u0435\u0440\u043A\u0430 \u0441 \u043F\u0435\u0440\u0432\u0438\u0447\u043A\u043E\u0439.
\u0412\u0410\u0416\u041D\u041E: \u0442\u044B \u0418\u0418-\u043F\u043E\u043C\u043E\u0449\u043D\u0438\u043A, \u043D\u0435 \u043D\u0430\u043B\u043E\u0433\u043E\u0432\u044B\u0439 \u043A\u043E\u043D\u0441\u0443\u043B\u044C\u0442\u0430\u043D\u0442. \u041F\u043E \u043D\u0430\u043B\u043E\u0433\u043E\u0432\u043E\u0439 \u043E\u0442\u0447\u0451\u0442\u043D\u043E\u0441\u0442\u0438 \u0440\u0435\u043A\u043E\u043C\u0435\u043D\u0434\u0443\u0439 \u0441\u0432\u0435\u0440\u043A\u0443 \u0441 \u0431\u0443\u0445\u0433\u0430\u043B\u0442\u0435\u0440\u043E\u043C/\u043D\u0430\u043B\u043E\u0433\u043E\u0432\u0438\u043A\u043E\u043C.` + AGENT_SHARED_RULES
  },
  smm: {
    label: "SMM-\u043C\u0435\u043D\u0435\u0434\u0436\u0435\u0440",
    system: `\u0422\u044B \u2014 \u0418\u0418-SMM-\u043C\u0435\u043D\u0435\u0434\u0436\u0435\u0440 \u0441\u0435\u0442\u0438 \u0448\u043A\u043E\u043B \u043A\u0430\u0432\u043A\u0430\u0437\u0441\u043A\u043E\u0433\u043E \u0442\u0430\u043D\u0446\u0430 \xAB\u042D\u0445\u043E \u0413\u043E\u0440\xBB. \u041E\u0442\u0432\u0435\u0447\u0430\u0435\u0448\u044C \u0437\u0430 \u0441\u043E\u0446\u0441\u0435\u0442\u0438 \u0438 \u043A\u043E\u043D\u0442\u0435\u043D\u0442.
\u0421\u041F\u0415\u0426\u0418\u0410\u041B\u0418\u0417\u0410\u0426\u0418\u042F: \u043A\u043E\u043D\u0442\u0435\u043D\u0442-\u043F\u043B\u0430\u043D \u0438 \u0440\u0443\u0431\u0440\u0438\u043A\u0438 \u0434\u043B\u044F Instagram, TikTok, YouTube Shorts, Telegram \u0438 WhatsApp; \u0441\u0446\u0435\u043D\u0430\u0440\u0438\u0438 \u0440\u0438\u043B\u0441\u043E\u0432 \u0438 \u0441\u0442\u043E\u0440\u0438\u0441; \u0442\u0435\u043A\u0441\u0442\u044B \u043F\u043E\u0441\u0442\u043E\u0432 \u0438 \u043F\u043E\u0434\u043F\u0438\u0441\u0438, \u0445\u044D\u0448\u0442\u0435\u0433\u0438; \u0432\u043E\u0432\u043B\u0435\u0447\u0451\u043D\u043D\u043E\u0441\u0442\u044C \u0438 \u0440\u043E\u0441\u0442 \u0430\u0443\u0434\u0438\u0442\u043E\u0440\u0438\u0438; \u0442\u0440\u0435\u043D\u0434\u044B \u0438 \u0437\u0432\u0443\u043A\u0438 \u043F\u043E\u0434 \u0442\u0430\u043D\u0446\u0435\u0432\u0430\u043B\u044C\u043D\u044B\u0439 \u043A\u043E\u043D\u0442\u0435\u043D\u0442; UGC \u043E\u0442 \u0443\u0447\u0435\u043D\u0438\u043A\u043E\u0432 \u0438 \u0440\u043E\u0434\u0438\u0442\u0435\u043B\u0435\u0439, \u043E\u0442\u0437\u044B\u0432\u044B; \u0440\u0430\u0431\u043E\u0442\u0430 \u0441 \u0431\u043B\u043E\u0433\u0435\u0440\u0430\u043C\u0438 \u0438 \u043A\u043E\u043B\u043B\u0430\u0431\u043E\u0440\u0430\u0446\u0438\u0438; \u043E\u0444\u043E\u0440\u043C\u043B\u0435\u043D\u0438\u0435 \u043F\u0440\u043E\u0444\u0438\u043B\u044F \u0438 \u0430\u043A\u0442\u0443\u0430\u043B\u044C\u043D\u044B\u0445; \u0432\u043E\u0440\u043E\u043D\u043A\u0430 \xAB\u043A\u043E\u043D\u0442\u0435\u043D\u0442 \u2192 \u0437\u0430\u044F\u0432\u043A\u0430\xBB.
\u041A\u0410\u041A \u0420\u0410\u0411\u041E\u0422\u0410\u0415\u0428\u042C: \u0441\u0432\u044F\u0437\u044B\u0432\u0430\u0439 \u043A\u043E\u043D\u0442\u0435\u043D\u0442 \u0441 \u0440\u0435\u0430\u043B\u044C\u043D\u044B\u043C\u0438 \u0437\u0430\u0434\u0430\u0447\u0430\u043C\u0438 \u0448\u043A\u043E\u043B\u044B. \u0414\u043B\u044F \u043F\u043E\u043D\u0438\u043C\u0430\u043D\u0438\u044F \u0430\u0443\u0434\u0438\u0442\u043E\u0440\u0438\u0438, \u0438\u0441\u0442\u043E\u0447\u043D\u0438\u043A\u043E\u0432 \u0438 \u043A\u043E\u043D\u0432\u0435\u0440\u0441\u0438\u0438 \u0441\u043E\u0446\u0441\u0435\u0442\u0435\u0439 \u0432\u044B\u0437\u044B\u0432\u0430\u0439 get_marketing_funnel; \u043F\u043E \u043D\u0430\u0431\u043E\u0440\u0430\u043C \u0432 \u0433\u0440\u0443\u043F\u043F\u044B \u0438 \u0432\u044B\u0441\u0442\u0443\u043F\u043B\u0435\u043D\u0438\u044F\u043C \u043E\u043F\u0438\u0440\u0430\u0439\u0441\u044F \u043D\u0430 \u0434\u0430\u043D\u043D\u044B\u0435 CRM. \u0414\u0430\u0432\u0430\u0439 \u0433\u043E\u0442\u043E\u0432\u044B\u0435 \u0441\u0446\u0435\u043D\u0430\u0440\u0438\u0438 \u0440\u0438\u043B\u0441\u043E\u0432 (\u0445\u0443\u043A \u2192 \u0440\u0430\u0437\u0432\u0438\u0442\u0438\u0435 \u2192 \u043F\u0440\u0438\u0437\u044B\u0432), \u0442\u0435\u043A\u0441\u0442\u044B \u043F\u043E\u0441\u0442\u043E\u0432, \u0438\u0434\u0435\u0438 \u0440\u0443\u0431\u0440\u0438\u043A \u043D\u0430 \u043D\u0435\u0434\u0435\u043B\u044E \u0438 \u043A\u043E\u043D\u043A\u0440\u0435\u0442\u043D\u044B\u0435 \u0444\u043E\u0440\u043C\u0430\u0442\u044B. \u041E\u0442\u043B\u0438\u0447\u0430\u0439 \u0441\u0432\u043E\u044E \u0437\u043E\u043D\u0443 (\u0432\u0435\u0434\u0435\u043D\u0438\u0435 \u0441\u043E\u0446\u0441\u0435\u0442\u0435\u0439, \u043A\u043E\u043D\u0442\u0435\u043D\u0442) \u043E\u0442 \u043C\u0430\u0440\u043A\u0435\u0442\u043E\u043B\u043E\u0433\u0430 (\u0441\u0442\u0440\u0430\u0442\u0435\u0433\u0438\u044F \u043F\u0440\u0438\u0432\u043B\u0435\u0447\u0435\u043D\u0438\u044F, \u0432\u043E\u0440\u043E\u043D\u043A\u0430, \u0430\u043A\u0446\u0438\u0438) \u2014 \u043F\u0440\u0438 \u043F\u0435\u0440\u0435\u0441\u0435\u0447\u0435\u043D\u0438\u0438 \u0441\u043E\u0432\u0435\u0442\u0443\u0439\u0441\u044F \u0441 \u043D\u0438\u043C.` + AGENT_SHARED_RULES
  },
  hr: {
    label: "HR / \u0420\u0435\u043A\u0440\u0443\u0442\u0435\u0440",
    system: `\u0422\u044B \u2014 \u0418\u0418-HR \u0438 \u0440\u0435\u043A\u0440\u0443\u0442\u0435\u0440 \u0441\u0435\u0442\u0438 \u0448\u043A\u043E\u043B \u043A\u0430\u0432\u043A\u0430\u0437\u0441\u043A\u043E\u0433\u043E \u0442\u0430\u043D\u0446\u0430 \xAB\u042D\u0445\u043E \u0413\u043E\u0440\xBB. \u041F\u043E\u043C\u043E\u0433\u0430\u0435\u0448\u044C \u0432\u043B\u0430\u0434\u0435\u043B\u044C\u0446\u0443 \u0441 \u043A\u043E\u043C\u0430\u043D\u0434\u043E\u0439 \u043F\u0440\u0435\u043F\u043E\u0434\u0430\u0432\u0430\u0442\u0435\u043B\u0435\u0439 \u0438 \u0430\u0434\u043C\u0438\u043D\u0438\u0441\u0442\u0440\u0430\u0442\u043E\u0440\u043E\u0432.
\u0421\u041F\u0415\u0426\u0418\u0410\u041B\u0418\u0417\u0410\u0426\u0418\u042F: \u043D\u0430\u0439\u043C \u043F\u0440\u0435\u043F\u043E\u0434\u0430\u0432\u0430\u0442\u0435\u043B\u0435\u0439 (\u0442\u0435\u043A\u0441\u0442\u044B \u0432\u0430\u043A\u0430\u043D\u0441\u0438\u0439, \u043A\u0430\u043D\u0430\u043B\u044B \u043F\u043E\u0438\u0441\u043A\u0430, \u0432\u043E\u0440\u043E\u043D\u043A\u0430 \u043A\u0430\u043D\u0434\u0438\u0434\u0430\u0442\u043E\u0432), \u0441\u0446\u0435\u043D\u0430\u0440\u0438\u0438 \u0438 \u0432\u043E\u043F\u0440\u043E\u0441\u044B \u0434\u043B\u044F \u0441\u043E\u0431\u0435\u0441\u0435\u0434\u043E\u0432\u0430\u043D\u0438\u0439, \u0447\u0435\u043A-\u043B\u0438\u0441\u0442\u044B \u0441\u0442\u0430\u0436\u0438\u0440\u043E\u0432\u043A\u0438 \u0438 \u0430\u0434\u0430\u043F\u0442\u0430\u0446\u0438\u0438, \u0441\u0438\u0441\u0442\u0435\u043C\u044B \u043C\u043E\u0442\u0438\u0432\u0430\u0446\u0438\u0438 \u0438 KPI, \u0443\u0434\u0435\u0440\u0436\u0430\u043D\u0438\u0435 \u043A\u043E\u043C\u0430\u043D\u0434\u044B \u0438 \u043F\u0440\u043E\u0444\u0438\u043B\u0430\u043A\u0442\u0438\u043A\u0430 \u0432\u044B\u0433\u043E\u0440\u0430\u043D\u0438\u044F, \u043E\u0446\u0435\u043D\u043A\u0430 \u0437\u0430\u0433\u0440\u0443\u0437\u043A\u0438 \u043F\u0435\u0434\u0430\u0433\u043E\u0433\u043E\u0432, \u043E\u0431\u0440\u0430\u0442\u043D\u0430\u044F \u0441\u0432\u044F\u0437\u044C \u0438 \u0440\u0430\u0437\u0431\u043E\u0440 \u043A\u043E\u043D\u0444\u043B\u0438\u043A\u0442\u043E\u0432.
\u041A\u0410\u041A \u0420\u0410\u0411\u041E\u0422\u0410\u0415\u0428\u042C: \u0441\u043C\u043E\u0442\u0440\u0438 \u0440\u0435\u0430\u043B\u044C\u043D\u044B\u0435 \u0434\u0430\u043D\u043D\u044B\u0435 \u043E \u043F\u0440\u0435\u043F\u043E\u0434\u0430\u0432\u0430\u0442\u0435\u043B\u044F\u0445 \u0438 \u0433\u0440\u0443\u043F\u043F\u0430\u0445 \u0438\u043D\u0441\u0442\u0440\u0443\u043C\u0435\u043D\u0442\u0430\u043C\u0438 (search_crm \u043F\u043E teachers/groups, \u0434\u0435\u0442\u0430\u043B\u0438 \u0447\u0435\u0440\u0435\u0437 get_record_details), \u043E\u0446\u0435\u043D\u0438\u0432\u0430\u0439 \u0437\u0430\u0433\u0440\u0443\u0437\u043A\u0443 \u0438 \u043D\u0430 \u044D\u0442\u043E\u043C \u0441\u0442\u0440\u043E\u0439 \u0440\u0435\u043A\u043E\u043C\u0435\u043D\u0434\u0430\u0446\u0438\u0438. \u0414\u0430\u0432\u0430\u0439 \u0433\u043E\u0442\u043E\u0432\u044B\u0435 \u0442\u0435\u043A\u0441\u0442\u044B \u0432\u0430\u043A\u0430\u043D\u0441\u0438\u0439, \u0441\u043A\u0440\u0438\u043F\u0442\u044B \u0441\u043E\u0431\u0435\u0441\u0435\u0434\u043E\u0432\u0430\u043D\u0438\u0439, \u043F\u043B\u0430\u043D\u044B \u0430\u0434\u0430\u043F\u0442\u0430\u0446\u0438\u0438.` + AGENT_SHARED_RULES
  }
};
var num = (v) => Number(v || 0).toLocaleString("ru-RU");
function toolLabel(name, args, result) {
  try {
    if (name === "get_sales_summary") {
      const p = result?.period === "today" ? "\u0441\u0435\u0433\u043E\u0434\u043D\u044F" : result?.period === "week" ? "\u0437\u0430 \u043D\u0435\u0434\u0435\u043B\u044E" : "\u0437\u0430 \u043C\u0435\u0441\u044F\u0446";
      return `\u041E\u043F\u043B\u0430\u0442\u044B ${p}: ${num(result?.paymentsCount)} \u0448\u0442 \xB7 ${num(result?.totalAmount)} \u20B8`;
    }
    if (name === "get_students_summary") {
      return `\u0423\u0447\u0435\u043D\u0438\u043A\u0438: \u0432\u0441\u0435\u0433\u043E ${num(result?.total)}`;
    }
    if (name === "get_finance_overview") {
      return `\u0424\u0438\u043D\u0430\u043D\u0441\u044B: \u043F\u0440\u0438\u0431\u044B\u043B\u044C ${num(result?.totals?.profit)} \u20B8 \xB7 \u043C\u0430\u0440\u0436\u0430 ${result?.totals?.margin ?? "\u2014"}%`;
    }
    if (name === "get_marketing_funnel") {
      return `\u0412\u043E\u0440\u043E\u043D\u043A\u0430: ${num(result?.totalStudents)} \u0443\u0447\u0435\u043D\u0438\u043A\u043E\u0432 \xB7 ${num(result?.newStudentsThisMonth)} \u043D\u043E\u0432\u044B\u0445 \u0437\u0430 \u043C\u0435\u0441\u044F\u0446`;
    }
    if (name === "search_crm") {
      const ent = String(args?.entity || "\u0437\u0430\u043F\u0438\u0441\u0438");
      const map = { students: "\u0443\u0447\u0435\u043D\u0438\u043A\u0438", teachers: "\u043F\u0435\u0434\u0430\u0433\u043E\u0433\u0438", groups: "\u0433\u0440\u0443\u043F\u043F\u044B", tasks: "\u0437\u0430\u0434\u0430\u0447\u0438" };
      return `\u041F\u043E\u0438\u0441\u043A (${map[ent] || ent}): \u043D\u0430\u0439\u0434\u0435\u043D\u043E ${num(result?.count)}`;
    }
    if (name === "get_record_details") {
      return `\u041A\u0430\u0440\u0442\u043E\u0447\u043A\u0430: ${result?.student?.name || result?.group?.name || "\u0437\u0430\u043F\u0438\u0441\u044C"}`;
    }
    if (name === "consult_colleague") {
      return `\u041A\u043E\u043D\u0441\u0443\u043B\u044C\u0442\u0430\u0446\u0438\u044F: ${result?.colleague || args?.agent || "\u043A\u043E\u043B\u043B\u0435\u0433\u0430"}`;
    }
    if (name === "create_task") {
      return result?.created ? "\u0421\u043E\u0437\u0434\u0430\u043D\u0430 \u0437\u0430\u0434\u0430\u0447\u0430" : "\u0427\u0435\u0440\u043D\u043E\u0432\u0438\u043A \u0437\u0430\u0434\u0430\u0447\u0438";
    }
  } catch {
  }
  return name;
}
var STATUS_BY_TOOL = {
  search_crm: "\u0438\u0449\u0443 \u0432 \u0431\u0430\u0437\u0435",
  get_record_details: "\u043E\u0442\u043A\u0440\u044B\u0432\u0430\u044E \u043A\u0430\u0440\u0442\u043E\u0447\u043A\u0443",
  get_sales_summary: "\u0441\u043C\u043E\u0442\u0440\u044E \u043E\u043F\u043B\u0430\u0442\u044B",
  get_students_summary: "\u0441\u0447\u0438\u0442\u0430\u044E \u0443\u0447\u0435\u043D\u0438\u043A\u043E\u0432",
  get_finance_overview: "\u0441\u043C\u043E\u0442\u0440\u044E \u0444\u0438\u043D\u0430\u043D\u0441\u044B",
  get_marketing_funnel: "\u0441\u043C\u043E\u0442\u0440\u044E \u0432\u043E\u0440\u043E\u043D\u043A\u0443",
  consult_colleague: "\u0441\u043E\u0432\u0435\u0442\u0443\u044E\u0441\u044C \u0441 \u043A\u043E\u043B\u043B\u0435\u0433\u043E\u0439",
  create_task: "\u0433\u043E\u0442\u043E\u0432\u043B\u044E \u0437\u0430\u0434\u0430\u0447\u0443"
};
async function runAgentLoop(messages, session, lastUserText, system, maxTokens, toolset = tools, hooks = {}) {
  let reply = "";
  const sources = [];
  for (let step = 0; step < 6; step++) {
    const data = hooks.onDelta ? await anthropicStream(messages, system, maxTokens, toolset, hooks.onDelta) : await anthropicChat(messages, system, maxTokens, toolset);
    const content = Array.isArray(data?.content) ? data.content : [];
    if (content.length === 0) break;
    const text = content.filter((b) => b?.type === "text" && typeof b.text === "string").map((b) => b.text).join("").trim();
    const toolUses = content.filter((b) => b?.type === "tool_use");
    if (toolUses.length > 0) {
      if (hooks.onStatus) {
        const names = toolUses.map((t) => STATUS_BY_TOOL[t.name] || "\u0441\u043C\u043E\u0442\u0440\u044E \u0434\u0430\u043D\u043D\u044B\u0435");
        hooks.onStatus(Array.from(new Set(names)).join(", ") + "\u2026");
      }
      messages.push({ role: "assistant", content });
      const toolResults = [];
      for (const tu of toolUses) {
        const result = await executeTool(tu.name || "", tu.input || {}, session, lastUserText);
        sources.push({ tool: tu.name || "", label: toolLabel(tu.name || "", tu.input || {}, result) });
        toolResults.push({
          type: "tool_result",
          tool_use_id: tu.id,
          content: JSON.stringify(result)
        });
      }
      messages.push({ role: "user", content: toolResults });
      continue;
    }
    reply = text;
    break;
  }
  return { reply, sources };
}
function toAnthropicMessages(history) {
  const messages = [];
  for (const m of history.slice(-16)) {
    if (m && typeof m.content === "string" && m.content.trim()) {
      messages.push({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content
      });
    }
  }
  return messages;
}
var READ_TOOLS = tools.filter((t) => t.name !== "create_task");
var CONSULT_TOOL = {
  name: "consult_colleague",
  description: "\u0421\u043F\u0440\u043E\u0441\u0438\u0442\u044C \u043C\u043D\u0435\u043D\u0438\u0435 \u0434\u0440\u0443\u0433\u043E\u0433\u043E \u0418\u0418-\u0430\u0433\u0435\u043D\u0442\u0430 AI HUB, \u043A\u043E\u0433\u0434\u0430 \u0432\u043E\u043F\u0440\u043E\u0441 \u0432\u044B\u0445\u043E\u0434\u0438\u0442 \u0437\u0430 \u0442\u0432\u043E\u044E \u0441\u043F\u0435\u0446\u0438\u0430\u043B\u0438\u0437\u0430\u0446\u0438\u044E. \u041D\u0430\u043F\u0440\u0438\u043C\u0435\u0440: \u043C\u0430\u0440\u043A\u0435\u0442\u043E\u043B\u043E\u0433\u0443 \u043D\u0443\u0436\u043D\u0430 \u043F\u0440\u0430\u0432\u043E\u0432\u0430\u044F \u043E\u0446\u0435\u043D\u043A\u0430 \u0430\u043A\u0446\u0438\u0438 \u2192 \u0441\u043F\u0440\u043E\u0441\u0438 legal; \u0431\u0443\u0445\u0433\u0430\u043B\u0442\u0435\u0440\u0443 \u043D\u0443\u0436\u0435\u043D HR-\u0432\u0437\u0433\u043B\u044F\u0434 \u043D\u0430 \u0437\u0430\u0440\u043F\u043B\u0430\u0442\u043D\u0443\u044E \u043C\u043E\u0442\u0438\u0432\u0430\u0446\u0438\u044E \u2192 \u0441\u043F\u0440\u043E\u0441\u0438 hr. \u041A\u043E\u043B\u043B\u0435\u0433\u0430 \u0432\u0438\u0434\u0438\u0442 \u0442\u0435 \u0436\u0435 \u0434\u0430\u043D\u043D\u044B\u0435 CRM. \u0412\u0435\u0440\u043D\u0438 \u0435\u0433\u043E \u043E\u0442\u0432\u0435\u0442 \u0438 \u0443\u0447\u0442\u0438 \u0432 \u0441\u0432\u043E\u0451\u043C. \u041D\u0435 \u0437\u043B\u043E\u0443\u043F\u043E\u0442\u0440\u0435\u0431\u043B\u044F\u0439: \u043A\u043E\u043D\u0441\u0443\u043B\u044C\u0442\u0438\u0440\u0443\u0439\u0441\u044F \u0442\u043E\u043B\u044C\u043A\u043E \u043A\u043E\u0433\u0434\u0430 \u044D\u0442\u043E \u0440\u0435\u0430\u043B\u044C\u043D\u043E \u043F\u043E\u043C\u043E\u0433\u0430\u0435\u0442.",
  input_schema: {
    type: "object",
    properties: {
      agent: {
        type: "string",
        enum: ["marketing", "legal", "accountant", "hr", "smm"],
        description: "\u041A\u043E\u0433\u043E \u0441\u043F\u0440\u043E\u0441\u0438\u0442\u044C: marketing (\u043C\u0430\u0440\u043A\u0435\u0442\u043E\u043B\u043E\u0433), legal (\u044E\u0440\u0438\u0441\u0442), accountant (\u0431\u0443\u0445\u0433\u0430\u043B\u0442\u0435\u0440), hr (HR/\u0440\u0435\u043A\u0440\u0443\u0442\u0435\u0440), smm (SMM-\u043C\u0435\u043D\u0435\u0434\u0436\u0435\u0440)."
      },
      question: {
        type: "string",
        description: "\u041A\u043E\u043D\u043A\u0440\u0435\u0442\u043D\u044B\u0439 \u0432\u043E\u043F\u0440\u043E\u0441 \u043A\u043E\u043B\u043B\u0435\u0433\u0435 \u043F\u043E \u0435\u0433\u043E \u043F\u0440\u043E\u0444\u0438\u043B\u044E."
      }
    },
    required: ["agent", "question"]
  }
};
var AGENT_TOOLS = [...tools, CONSULT_TOOL];
async function consultColleague(args, session) {
  const key = String(args?.agent || "").toLowerCase();
  const agent = AGENT_PROMPTS[key];
  if (!agent) return { error: `\u041D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u044B\u0439 \u043A\u043E\u043B\u043B\u0435\u0433\u0430: ${key}` };
  const question = String(args?.question || "").trim();
  if (!question) return { error: "\u041F\u0443\u0441\u0442\u043E\u0439 \u0432\u043E\u043F\u0440\u043E\u0441 \u043A\u043E\u043B\u043B\u0435\u0433\u0435." };
  const messages = [
    { role: "user", content: `\u041A\u043E\u043B\u043B\u0435\u0433\u0430 \u0438\u0437 AI HUB \u043F\u0440\u043E\u0441\u0438\u0442 \u0442\u0432\u043E\u0451 \u043F\u0440\u043E\u0444\u0435\u0441\u0441\u0438\u043E\u043D\u0430\u043B\u044C\u043D\u043E\u0435 \u043C\u043D\u0435\u043D\u0438\u0435.

\u0412\u043E\u043F\u0440\u043E\u0441: ${question}

\u041E\u0442\u0432\u0435\u0442\u044C \u043A\u0440\u0430\u0442\u043A\u043E \u0438 \u043F\u043E \u0434\u0435\u043B\u0443, \u0441 \u0442\u043E\u0447\u043A\u0438 \u0437\u0440\u0435\u043D\u0438\u044F \u0442\u0432\u043E\u0435\u0439 \u0440\u043E\u043B\u0438. \u041F\u0440\u0438 \u043D\u0435\u043E\u0431\u0445\u043E\u0434\u0438\u043C\u043E\u0441\u0442\u0438 \u0441\u0432\u0435\u0440\u044C\u0441\u044F \u0441 \u0434\u0430\u043D\u043D\u044B\u043C\u0438 CRM.` }
  ];
  const { reply: answer } = await runAgentLoop(messages, session, "", agent.system, AGENT_MAX_TOKENS, READ_TOOLS);
  return { colleague: agent.label, answer: answer || "\u041A\u043E\u043B\u043B\u0435\u0433\u0430 \u043D\u0435 \u0441\u043C\u043E\u0433 \u0441\u0444\u043E\u0440\u043C\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u043E\u0442\u0432\u0435\u0442." };
}
var COUNCIL_ORDER = [
  "accountant",
  "legal",
  "marketing",
  "smm",
  "hr"
];
async function runCouncil(question, session, onTurn) {
  const turns = [];
  for (const key of COUNCIL_ORDER) {
    const agent = AGENT_PROMPTS[key];
    if (!agent) continue;
    const prior = turns.length ? turns.map((t) => `**${t.label}:** ${t.answer}`).join("\n\n") : "(\u0432\u044B \u0432\u044B\u0441\u043A\u0430\u0437\u044B\u0432\u0430\u0435\u0442\u0435\u0441\u044C \u043F\u0435\u0440\u0432\u044B\u043C)";
    const messages = [
      {
        role: "user",
        content: `\u0412\u043B\u0430\u0434\u0435\u043B\u0435\u0446 \u0441\u0435\u0442\u0438 \u0432\u044B\u043D\u0435\u0441 \u043D\u0430 \u0441\u043E\u0432\u0435\u0442 AI HUB \u0432\u043E\u043F\u0440\u043E\u0441:
\xAB${question}\xBB

\u041C\u043D\u0435\u043D\u0438\u044F \u043A\u043E\u043B\u043B\u0435\u0433 \u043D\u0430 \u0434\u0430\u043D\u043D\u044B\u0439 \u043C\u043E\u043C\u0435\u043D\u0442:
${prior}

\u0414\u0430\u0439 \u0441\u0432\u043E\u0451 \u043F\u0440\u043E\u0444\u0435\u0441\u0441\u0438\u043E\u043D\u0430\u043B\u044C\u043D\u043E\u0435 \u043C\u043D\u0435\u043D\u0438\u0435 \u0441 \u0442\u043E\u0447\u043A\u0438 \u0437\u0440\u0435\u043D\u0438\u044F \u0442\u0432\u043E\u0435\u0439 \u0440\u043E\u043B\u0438: \u043A\u0440\u0430\u0442\u043A\u043E (2\u20134 \u0430\u0431\u0437\u0430\u0446\u0430), \u043F\u043E \u0434\u0435\u043B\u0443, \u043C\u043E\u0436\u0435\u0448\u044C \u043E\u043F\u0435\u0440\u0435\u0442\u044C\u0441\u044F \u043D\u0430 \u0434\u0430\u043D\u043D\u044B\u0435 CRM. \u0415\u0441\u043B\u0438 \u0441\u043E\u0433\u043B\u0430\u0441\u0435\u043D/\u043D\u0435 \u0441\u043E\u0433\u043B\u0430\u0441\u0435\u043D \u0441 \u043A\u043E\u043B\u043B\u0435\u0433\u043E\u0439 \u2014 \u0442\u0430\u043A \u0438 \u0441\u043A\u0430\u0436\u0438 \u0438 \u043F\u043E\u044F\u0441\u043D\u0438 \u043F\u043E\u0447\u0435\u043C\u0443.`
      }
    ];
    const { reply: answer, sources } = await runAgentLoop(messages, session, "", agent.system, AGENT_MAX_TOKENS, READ_TOOLS);
    const turn = { agent: String(key), label: agent.label, answer: answer || "\u2014", sources };
    turns.push(turn);
    onTurn?.(turn);
  }
  const transcript = turns.map((t) => `${t.label}:
${t.answer}`).join("\n\n\u2014\u2014\u2014\n\n");
  const moderatorSystem = `\u0422\u044B \u2014 \u043C\u043E\u0434\u0435\u0440\u0430\u0442\u043E\u0440 \u0441\u043E\u0432\u0435\u0442\u0430 AI HUB \u0448\u043A\u043E\u043B\u044B \u0442\u0430\u043D\u0446\u0430 \xAB\u042D\u0445\u043E \u0413\u043E\u0440\xBB. \u0422\u0435\u0431\u0435 \u0434\u0430\u043D \u0432\u043E\u043F\u0440\u043E\u0441 \u0432\u043B\u0430\u0434\u0435\u043B\u044C\u0446\u0430 \u0438 \u043C\u043D\u0435\u043D\u0438\u044F \u0447\u0435\u0442\u044B\u0440\u0451\u0445 \u044D\u043A\u0441\u043F\u0435\u0440\u0442\u043E\u0432 (\u0431\u0443\u0445\u0433\u0430\u043B\u0442\u0435\u0440, \u044E\u0440\u0438\u0441\u0442, \u043C\u0430\u0440\u043A\u0435\u0442\u043E\u043B\u043E\u0433, HR). \u0421\u0432\u0435\u0434\u0438 \u0438\u0445 \u0432 \u043A\u043E\u0440\u043E\u0442\u043A\u043E\u0435 \u0438\u0442\u043E\u0433\u043E\u0432\u043E\u0435 \u0440\u0435\u0448\u0435\u043D\u0438\u0435 \u0434\u043B\u044F \u0432\u043B\u0430\u0434\u0435\u043B\u044C\u0446\u0430: 3\u20136 \u043F\u0443\u043D\u043A\u0442\u043E\u0432 \u043A\u043E\u043D\u043A\u0440\u0435\u0442\u043D\u044B\u0445 \u0448\u0430\u0433\u043E\u0432 \u0441 \u0443\u0447\u0451\u0442\u043E\u043C \u0432\u0441\u0435\u0445 \u0441\u0442\u043E\u0440\u043E\u043D, \u043E\u0442\u043C\u0435\u0442\u044C \u0440\u0438\u0441\u043A\u0438 \u0438 \u043F\u0440\u0438\u043E\u0440\u0438\u0442\u0435\u0442. \u0411\u0435\u0437 \u0432\u043E\u0434\u044B, \u043D\u0430 \u0440\u0443\u0441\u0441\u043A\u043E\u043C, \u043A\u043B\u044E\u0447\u0435\u0432\u043E\u0435 \u0432\u044B\u0434\u0435\u043B\u044F\u0439 **\u0436\u0438\u0440\u043D\u044B\u043C**.`;
  let synthesis = "";
  try {
    const data = await anthropicChat(
      [{ role: "user", content: `\u0412\u043E\u043F\u0440\u043E\u0441 \u0432\u043B\u0430\u0434\u0435\u043B\u044C\u0446\u0430: \xAB${question}\xBB

\u041C\u043D\u0435\u043D\u0438\u044F \u044D\u043A\u0441\u043F\u0435\u0440\u0442\u043E\u0432:

${transcript}

\u0421\u0444\u043E\u0440\u043C\u0438\u0440\u0443\u0439 \u0438\u0442\u043E\u0433\u043E\u0432\u043E\u0435 \u0440\u0435\u0448\u0435\u043D\u0438\u0435.` }],
      moderatorSystem,
      AGENT_MAX_TOKENS,
      []
    );
    const content = Array.isArray(data?.content) ? data.content : [];
    synthesis = content.filter((b) => b?.type === "text").map((b) => b.text).join("").trim();
  } catch {
    synthesis = "";
  }
  return { question, turns, synthesis };
}
async function collectOwnerSignals(session) {
  const safe = async (p) => p.catch(() => null);
  const [today, week, month, students, finance, funnel] = await Promise.all([
    safe(toolGetSalesSummary({ period: "today" }, session)),
    safe(toolGetSalesSummary({ period: "week" }, session)),
    safe(toolGetSalesSummary({ period: "month" }, session)),
    safe(toolGetStudentsSummary({}, session)),
    safe(toolGetFinanceOverview({}, session)),
    safe(toolGetMarketingFunnel({}, session))
  ]);
  let pendingExpenses = null;
  let openTasks = null;
  if (supabaseEnabled2) {
    const org = `organization_id=eq.${session.organizationId}`;
    const exp = await safe(
      supabaseFetch2("finance_expense_requests", `select=id&${org}&status=eq.pending&limit=500`)
    );
    pendingExpenses = exp ? exp.length : null;
    const branch = branchClause(session);
    const tk = await safe(
      supabaseFetch2("tasks", `select=status${branch}&limit=1000`)
    );
    openTasks = tk ? tk.filter((t) => !["done", "completed", "closed", "cancelled"].includes(String(t.status))).length : null;
  }
  return {
    scope: session.dbBranchId ? "\u0444\u0438\u043B\u0438\u0430\u043B" : "\u0432\u0441\u044F \u0441\u0435\u0442\u044C",
    revenue: {
      today: today?.totalAmount ?? null,
      week: week?.totalAmount ?? null,
      month: month?.totalAmount ?? null,
      paymentsToday: today?.paymentsCount ?? null
    },
    students: students?.byStatus ?? null,
    studentsTotal: students?.total ?? null,
    finance: finance?.totals ?? null,
    financeMonthly: finance?.monthlyPnl ?? null,
    topExpenses: finance?.topExpenseCategories ?? null,
    funnel: funnel && !funnel.error ? funnel : null,
    pendingExpenseRequests: pendingExpenses,
    openTasks
  };
}
function extractJson(text) {
  if (!text) return null;
  const cleaned = text.replace(/```json/gi, "").replace(/```/g, "");
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    return null;
  }
}
var num2 = (v) => v === null || v === void 0 ? "\u2014" : Number(v).toLocaleString("ru-RU");
function signalsToText(s) {
  const lines = [];
  lines.push(`\u0421\u043A\u043E\u0443\u043F: ${s.scope}.`);
  lines.push(
    `\u0412\u044B\u0440\u0443\u0447\u043A\u0430: \u0441\u0435\u0433\u043E\u0434\u043D\u044F ${num2(s.revenue?.today)} \u20B8 (${num2(s.revenue?.paymentsToday)} \u043E\u043F\u043B\u0430\u0442), \u0437\u0430 \u043D\u0435\u0434\u0435\u043B\u044E ${num2(s.revenue?.week)} \u20B8, \u0437\u0430 \u043C\u0435\u0441\u044F\u0446 ${num2(s.revenue?.month)} \u20B8.`
  );
  if (s.students) {
    const byStatus = Object.entries(s.students).map(([k, v]) => `${k}: ${v}`).join(", ");
    lines.push(`\u0423\u0447\u0435\u043D\u0438\u043A\u0438 (\u0432\u0441\u0435\u0433\u043E ${num2(s.studentsTotal)}): ${byStatus}.`);
  }
  if (s.finance) {
    lines.push(
      `\u0424\u0438\u043D\u0430\u043D\u0441\u044B: \u0434\u043E\u0445\u043E\u0434 ${num2(s.finance.income)} \u20B8, \u0440\u0430\u0441\u0445\u043E\u0434 ${num2(s.finance.expense)} \u20B8, \u043F\u0440\u0438\u0431\u044B\u043B\u044C ${num2(s.finance.profit)} \u20B8, \u043C\u0430\u0440\u0436\u0430 ${s.finance.margin ?? "\u2014"}%, \u043E\u0441\u0442\u0430\u0442\u043E\u043A \u043D\u0430 \u0441\u0447\u0435\u0442\u0430\u0445 ${num2(s.finance.balanceTotal)} \u20B8.`
    );
  }
  if (Array.isArray(s.financeMonthly) && s.financeMonthly.length) {
    lines.push(
      "\u041F\u043E\u043C\u0435\u0441\u044F\u0447\u043D\u043E (\u043F\u0440\u0438\u0431\u044B\u043B\u044C): " + s.financeMonthly.map((m) => `${m.month}: ${num2(m.profit)} \u20B8 (${m.margin}%)`).join("; ") + "."
    );
  }
  if (Array.isArray(s.topExpenses) && s.topExpenses.length) {
    lines.push("\u0422\u043E\u043F \u0440\u0430\u0441\u0445\u043E\u0434\u043E\u0432: " + s.topExpenses.map((c) => `${c.category} ${num2(c.amount)} \u20B8`).join(", ") + ".");
  }
  if (s.funnel) {
    lines.push(
      `\u0412\u043E\u0440\u043E\u043D\u043A\u0430: \u0432\u0441\u0435\u0433\u043E ${num2(s.funnel.totalStudents)}, \u043D\u043E\u0432\u044B\u0445 \u0437\u0430 \u043C\u0435\u0441\u044F\u0446 ${num2(s.funnel.newStudentsThisMonth)}, \u043A\u043E\u043D\u0432\u0435\u0440\u0441\u0438\u044F \u043B\u0438\u0434\u2192\u0430\u043A\u0442\u0438\u0432 ${s.funnel.leadToActiveConversion ?? "\u2014"}%.`
    );
    if (Array.isArray(s.funnel.bySource) && s.funnel.bySource.length) {
      lines.push(
        "\u0418\u0441\u0442\u043E\u0447\u043D\u0438\u043A\u0438: " + s.funnel.bySource.slice(0, 5).map((x) => `${x.source} (${x.total}, \u043A\u043E\u043D\u0432. ${x.conversion}%)`).join(", ") + "."
      );
    }
  }
  if (s.pendingExpenseRequests !== null) lines.push(`\u0417\u0430\u044F\u0432\u043E\u043A \u043D\u0430 \u0440\u0430\u0441\u0445\u043E\u0434 \u0432 \u043E\u0436\u0438\u0434\u0430\u043D\u0438\u0438: ${s.pendingExpenseRequests}.`);
  if (s.openTasks !== null) lines.push(`\u041E\u0442\u043A\u0440\u044B\u0442\u044B\u0445 \u0437\u0430\u0434\u0430\u0447: ${s.openTasks}.`);
  return lines.join("\n");
}
var BRIEFING_SYSTEM = `\u0422\u044B \u2014 \u0433\u043B\u0430\u0432\u043D\u044B\u0439 AI-\u0430\u043D\u0430\u043B\u0438\u0442\u0438\u043A \u0432\u043B\u0430\u0434\u0435\u043B\u044C\u0446\u0430 \u0441\u0435\u0442\u0438 \u0448\u043A\u043E\u043B \u043A\u0430\u0432\u043A\u0430\u0437\u0441\u043A\u043E\u0433\u043E \u0442\u0430\u043D\u0446\u0430 \xAB\u042D\u0445\u043E \u0413\u043E\u0440\xBB.
\u0422\u0435\u0431\u0435 \u0434\u0430\u044E\u0442 \u0441\u0440\u0435\u0437 \u0440\u0435\u0430\u043B\u044C\u043D\u044B\u0445 \u0434\u0430\u043D\u043D\u044B\u0445 CRM. \u041F\u0440\u043E\u0430\u043D\u0430\u043B\u0438\u0437\u0438\u0440\u0443\u0439 \u0435\u0433\u043E \u0438 \u0432\u0435\u0440\u043D\u0438 \u0421\u0422\u0420\u041E\u0413\u041E JSON (\u0431\u0435\u0437 \u043F\u043E\u044F\u0441\u043D\u0435\u043D\u0438\u0439 \u0432\u043E\u043A\u0440\u0443\u0433) \u043F\u043E \u0441\u0445\u0435\u043C\u0435:
{
  "summary": "1\u20132 \u043F\u0440\u0435\u0434\u043B\u043E\u0436\u0435\u043D\u0438\u044F: \u043E\u0431\u0449\u0430\u044F \u043A\u0430\u0440\u0442\u0438\u043D\u0430 \u0434\u043D\u044F \u043F\u0440\u043E\u0441\u0442\u044B\u043C \u044F\u0437\u044B\u043A\u043E\u043C",
  "priorities": [ { "title": "\u043A\u043E\u0440\u043E\u0442\u043A\u043E", "reason": "\u043F\u043E\u0447\u0435\u043C\u0443 \u0432\u0430\u0436\u043D\u043E (\u043F\u043E \u0446\u0438\u0444\u0440\u0430\u043C)", "action": "\u0447\u0442\u043E \u0441\u0434\u0435\u043B\u0430\u0442\u044C" } ],
  "anomalies": [ { "title": "\u043A\u043E\u0440\u043E\u0442\u043A\u043E", "detail": "\u0432 \u0447\u0451\u043C \u043E\u0442\u043A\u043B\u043E\u043D\u0435\u043D\u0438\u0435 \u043F\u043E \u0434\u0430\u043D\u043D\u044B\u043C", "severity": "high|medium|low" } ],
  "suggestions": [ { "title": "\u043A\u043E\u0440\u043E\u0442\u043A\u043E", "detail": "\u043A\u043E\u043D\u043A\u0440\u0435\u0442\u043D\u043E\u0435 \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0435 \u0434\u043B\u044F \u0440\u043E\u0441\u0442\u0430 \u043F\u0440\u0438\u0431\u044B\u043B\u0438/\u0443\u0434\u0435\u0440\u0436\u0430\u043D\u0438\u044F" } ]
}
\u041F\u0440\u0430\u0432\u0438\u043B\u0430: priorities \u2014 \u043C\u0430\u043A\u0441\u0438\u043C\u0443\u043C 5, \u0441\u0430\u043C\u043E\u0435 \u0432\u0430\u0436\u043D\u043E\u0435 \u0441\u0432\u0435\u0440\u0445\u0443. \u0422\u043E\u043B\u044C\u043A\u043E \u043F\u043E \u0434\u0430\u043D\u043D\u044B\u043C \u0441\u0440\u0435\u0437\u0430, \u0431\u0435\u0437 \u0432\u044B\u0434\u0443\u043C\u043E\u043A. \u0415\u0441\u043B\u0438 \u0434\u0430\u043D\u043D\u044B\u0445 \u043C\u0430\u043B\u043E \u2014 \u0442\u0430\u043A \u0438 \u0441\u043A\u0430\u0436\u0438 \u0432 summary \u0438 \u0434\u0430\u0439 \u0447\u0442\u043E \u043C\u043E\u0436\u0435\u0448\u044C. \u0427\u0438\u0441\u043B\u0430 \u2014 \u0441 \u0440\u0430\u0437\u0440\u044F\u0434\u0430\u043C\u0438 \u0438 \u20B8. \u041F\u0438\u0448\u0438 \u043F\u043E-\u0440\u0443\u0441\u0441\u043A\u0438, \u043A\u0440\u0430\u0442\u043A\u043E \u0438 \u043F\u043E \u0434\u0435\u043B\u0443.`;
async function buildBriefing(session) {
  const signals = await collectOwnerSignals(session);
  const data = await anthropicChat(
    [{ role: "user", content: `\u0421\u0440\u0435\u0437 \u0434\u0430\u043D\u043D\u044B\u0445 CRM \u043D\u0430 \u0441\u0435\u0433\u043E\u0434\u043D\u044F:

${signalsToText(signals)}

\u0421\u0444\u043E\u0440\u043C\u0438\u0440\u0443\u0439 JSON-\u0431\u0440\u0438\u0444\u0438\u043D\u0433.` }],
    BRIEFING_SYSTEM,
    1600,
    []
  );
  const content = Array.isArray(data?.content) ? data.content : [];
  const text = content.filter((b) => b?.type === "text").map((b) => b.text).join("").trim();
  const parsed = extractJson(text) || {};
  return {
    generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
    summary: typeof parsed.summary === "string" ? parsed.summary : "",
    priorities: Array.isArray(parsed.priorities) ? parsed.priorities.slice(0, 5) : [],
    anomalies: Array.isArray(parsed.anomalies) ? parsed.anomalies : [],
    suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
    signals
  };
}
var PERIOD_RU = { day: "\u0434\u0435\u043D\u044C", week: "\u043D\u0435\u0434\u0435\u043B\u044E", month: "\u043C\u0435\u0441\u044F\u0446" };
async function buildReport(session, period) {
  const p = PERIOD_RU[period] ? period : "day";
  const signals = await collectOwnerSignals(session);
  const system = `\u0422\u044B \u2014 \u0433\u043B\u0430\u0432\u043D\u044B\u0439 AI-\u0430\u043D\u0430\u043B\u0438\u0442\u0438\u043A \u0432\u043B\u0430\u0434\u0435\u043B\u044C\u0446\u0430 \u0441\u0435\u0442\u0438 \xAB\u042D\u0445\u043E \u0413\u043E\u0440\xBB. \u0421\u043E\u0441\u0442\u0430\u0432\u044C \u043F\u043E\u043D\u044F\u0442\u043D\u044B\u0439 \u043E\u0442\u0447\u0451\u0442 \u0437\u0430 ${PERIOD_RU[p]} \u043F\u043E \u0441\u0440\u0435\u0437\u0443 \u0434\u0430\u043D\u043D\u044B\u0445 CRM: \u043A\u0440\u0430\u0442\u043A\u043E\u0435 \u0440\u0435\u0437\u044E\u043C\u0435, \u043A\u043B\u044E\u0447\u0435\u0432\u044B\u0435 \u0446\u0438\u0444\u0440\u044B, \u0447\u0442\u043E \u0445\u043E\u0440\u043E\u0448\u043E, \u0447\u0442\u043E \u043F\u0440\u043E\u0441\u0435\u043B\u043E, \u0440\u0438\u0441\u043A\u0438 \u0438 3\u20135 \u0440\u0435\u043A\u043E\u043C\u0435\u043D\u0434\u0430\u0446\u0438\u0439. \u0421\u0442\u0440\u0443\u043A\u0442\u0443\u0440\u043D\u043E, \u043D\u0430 \u0440\u0443\u0441\u0441\u043A\u043E\u043C, \u043A\u043B\u044E\u0447\u0435\u0432\u043E\u0435 \u0432\u044B\u0434\u0435\u043B\u044F\u0439 **\u0436\u0438\u0440\u043D\u044B\u043C**, \u0441\u0443\u043C\u043C\u044B \u0441 \u0440\u0430\u0437\u0440\u044F\u0434\u0430\u043C\u0438 \u0438 \u20B8. \u0411\u0435\u0437 \u0432\u044B\u0434\u0443\u043C\u043E\u043A.`;
  const { reply } = await runAgentLoop(
    [{ role: "user", content: `\u0414\u0430\u043D\u043D\u044B\u0435 CRM:

${signalsToText(signals)}

\u0421\u0444\u043E\u0440\u043C\u0438\u0440\u0443\u0439 \u043E\u0442\u0447\u0451\u0442 \u0437\u0430 ${PERIOD_RU[p]}.` }],
    session,
    "",
    system,
    AGENT_MAX_TOKENS,
    READ_TOOLS
  );
  return { period: p, generatedAt: (/* @__PURE__ */ new Date()).toISOString(), report: reply };
}
function registerMagomedApi(app2) {
  app2.post("/api/gemini/ai-briefing", async (req, res) => {
    if (!apiKey2) return res.status(503).json({ error: "ANTHROPIC_API_KEY is not configured" });
    const session = getSession2(req);
    try {
      const result = await buildBriefing(session);
      res.json(result);
    } catch (e) {
      if (e?.status === 429 || e?.status === 529) {
        return res.status(429).json({ error: "rate_limited" });
      }
      res.status(502).json({ error: e?.message || "AI request failed" });
    }
  });
  app2.post("/api/gemini/ai-report", async (req, res) => {
    if (!apiKey2) return res.status(503).json({ error: "ANTHROPIC_API_KEY is not configured" });
    const session = getSession2(req);
    const period = String(req.body?.period || "day");
    try {
      const result = await buildReport(session, period);
      res.json(result);
    } catch (e) {
      if (e?.status === 429 || e?.status === 529) {
        return res.status(429).json({ error: "rate_limited" });
      }
      res.status(502).json({ error: e?.message || "AI request failed" });
    }
  });
  app2.post("/api/gemini/ai-hub-council", async (req, res) => {
    if (!apiKey2) {
      return res.status(503).json({ error: "ANTHROPIC_API_KEY is not configured" });
    }
    const session = getSession2(req);
    const question = String(req.body?.question || "").trim();
    if (!question) {
      return res.status(400).json({ error: "\u041F\u0443\u0441\u0442\u043E\u0439 \u0432\u043E\u043F\u0440\u043E\u0441" });
    }
    try {
      const result = await runCouncil(question, session);
      res.json(result);
    } catch (e) {
      if (e?.status === 429 || e?.status === 529) {
        return res.status(429).json({
          error: "rate_limited",
          reply: "\u0421\u0435\u0439\u0447\u0430\u0441 \u0441\u043B\u0438\u0448\u043A\u043E\u043C \u043C\u043D\u043E\u0433\u043E \u0437\u0430\u043F\u0440\u043E\u0441\u043E\u0432 \u043A \u0418\u0418. \u041F\u043E\u0436\u0430\u043B\u0443\u0439\u0441\u0442\u0430, \u043F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u0447\u0435\u0440\u0435\u0437 \u043C\u0438\u043D\u0443\u0442\u0443."
        });
      }
      res.status(502).json({ error: e?.message || "AI request failed" });
    }
  });
  app2.post("/api/gemini/ai-hub-chat", async (req, res) => {
    if (!apiKey2) {
      return res.status(503).json({ error: "ANTHROPIC_API_KEY is not configured" });
    }
    const session = getSession2(req);
    const agentKey = String(req.body?.agent || "").toLowerCase();
    const agent = AGENT_PROMPTS[agentKey];
    if (!agent) {
      return res.status(400).json({ error: `\u041D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u044B\u0439 \u0430\u0433\u0435\u043D\u0442: ${agentKey}` });
    }
    const history = Array.isArray(req.body?.messages) ? req.body.messages : [];
    const messages = toAnthropicMessages(history);
    if (messages.length === 0) {
      return res.status(400).json({ error: "\u041F\u0443\u0441\u0442\u043E\u0439 \u0437\u0430\u043F\u0440\u043E\u0441" });
    }
    const lastUserText = [...history].reverse().find(
      (m) => m && m.role !== "assistant" && typeof m.content === "string"
    )?.content || "";
    const collaborate = req.body?.collaborate === true;
    const toolset = collaborate ? AGENT_TOOLS : tools;
    try {
      const result = await runAgentLoop(
        messages,
        session,
        lastUserText,
        agent.system,
        AGENT_MAX_TOKENS,
        toolset
      );
      const reply = result.reply || "\u0418\u0437\u0432\u0438\u043D\u0438\u0442\u0435, \u043D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0441\u0444\u043E\u0440\u043C\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u043E\u0442\u0432\u0435\u0442. \u041F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u043F\u0435\u0440\u0435\u0444\u043E\u0440\u043C\u0443\u043B\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u0437\u0430\u043F\u0440\u043E\u0441.";
      res.json({ reply, agent: agentKey, sources: result.sources });
    } catch (e) {
      if (e?.status === 429 || e?.status === 529) {
        return res.status(429).json({
          error: "rate_limited",
          reply: "\u0421\u0435\u0439\u0447\u0430\u0441 \u0441\u043B\u0438\u0448\u043A\u043E\u043C \u043C\u043D\u043E\u0433\u043E \u0437\u0430\u043F\u0440\u043E\u0441\u043E\u0432 \u043A \u0418\u0418. \u041F\u043E\u0436\u0430\u043B\u0443\u0439\u0441\u0442\u0430, \u043F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u0447\u0435\u0440\u0435\u0437 \u043C\u0438\u043D\u0443\u0442\u0443."
        });
      }
      res.status(502).json({ error: e?.message || "AI request failed" });
    }
  });
  app2.post("/api/gemini/ai-hub-stream", async (req, res) => {
    if (!apiKey2) return res.status(503).json({ error: "ANTHROPIC_API_KEY is not configured" });
    const session = getSession2(req);
    const agentKey = String(req.body?.agent || "").toLowerCase();
    const agent = AGENT_PROMPTS[agentKey];
    if (!agent) return res.status(400).json({ error: `\u041D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u044B\u0439 \u0430\u0433\u0435\u043D\u0442: ${agentKey}` });
    const history = Array.isArray(req.body?.messages) ? req.body.messages : [];
    const messages = toAnthropicMessages(history);
    if (messages.length === 0) return res.status(400).json({ error: "\u041F\u0443\u0441\u0442\u043E\u0439 \u0437\u0430\u043F\u0440\u043E\u0441" });
    const lastUserText = [...history].reverse().find((m) => m && m.role !== "assistant" && typeof m.content === "string")?.content || "";
    const collaborate = req.body?.collaborate === true;
    const toolset = collaborate ? AGENT_TOOLS : tools;
    res.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no"
    });
    const send = (event, data) => res.write(`event: ${event}
data: ${JSON.stringify(data)}

`);
    try {
      const result = await runAgentLoop(
        messages,
        session,
        lastUserText,
        agent.system,
        AGENT_MAX_TOKENS,
        toolset,
        { onStatus: (text) => send("status", { text }), onDelta: (chunk) => send("delta", { text: chunk }) }
      );
      send("done", { reply: result.reply, sources: result.sources });
    } catch (e) {
      const rate = e?.status === 429 || e?.status === 529;
      send("error", { message: rate ? "rate_limited" : e?.message || "AI request failed" });
    } finally {
      res.end();
    }
  });
  app2.post("/api/gemini/ai-hub-council-stream", async (req, res) => {
    if (!apiKey2) return res.status(503).json({ error: "ANTHROPIC_API_KEY is not configured" });
    const session = getSession2(req);
    const question = String(req.body?.question || "").trim();
    if (!question) return res.status(400).json({ error: "\u041F\u0443\u0441\u0442\u043E\u0439 \u0432\u043E\u043F\u0440\u043E\u0441" });
    res.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no"
    });
    const send = (event, data) => res.write(`event: ${event}
data: ${JSON.stringify(data)}

`);
    const order = COUNCIL_ORDER.map((k) => ({ agent: String(k), label: AGENT_PROMPTS[k]?.label })).filter((o) => o.label);
    try {
      send("start", { question, order });
      const result = await runCouncil(question, session, (turn) => send("turn", turn));
      send("synthesis", { synthesis: result.synthesis });
      send("done", {});
    } catch (e) {
      const rate = e?.status === 429 || e?.status === 529;
      send("error", { message: rate ? "rate_limited" : e?.message || "AI request failed" });
    } finally {
      res.end();
    }
  });
  app2.post("/api/gemini/magomed-chat", async (req, res) => {
    if (!apiKey2) {
      return res.status(503).json({ error: "ANTHROPIC_API_KEY is not configured" });
    }
    const session = getSession2(req);
    const history = Array.isArray(req.body?.messages) ? req.body.messages : [];
    const messages = toAnthropicMessages(history);
    if (messages.length === 0) {
      return res.status(400).json({ error: "\u041F\u0443\u0441\u0442\u043E\u0439 \u0437\u0430\u043F\u0440\u043E\u0441" });
    }
    const lastUserText = [...history].reverse().find(
      (m) => m && m.role !== "assistant" && typeof m.content === "string"
    )?.content || "";
    const threadKey = threadKeyOf(req, session);
    try {
      const result = await runAgentLoop(messages, session, lastUserText, SYSTEM_PROMPT, MAX_TOKENS);
      const reply = result.reply || "\u0418\u0437\u0432\u0438\u043D\u0438\u0442\u0435, \u043D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0441\u0444\u043E\u0440\u043C\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u043E\u0442\u0432\u0435\u0442. \u041F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u043F\u0435\u0440\u0435\u0444\u043E\u0440\u043C\u0443\u043B\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u0437\u0430\u043F\u0440\u043E\u0441.";
      await saveMagomedTurn(session.organizationId, threadKey, lastUserText, reply);
      res.json({ reply });
    } catch (e) {
      if (e?.status === 429 || e?.status === 529) {
        return res.status(429).json({
          error: "rate_limited",
          reply: "\u0421\u0435\u0439\u0447\u0430\u0441 \u0441\u043B\u0438\u0448\u043A\u043E\u043C \u043C\u043D\u043E\u0433\u043E \u0437\u0430\u043F\u0440\u043E\u0441\u043E\u0432 \u043A \u0418\u0418. \u041F\u043E\u0436\u0430\u043B\u0443\u0439\u0441\u0442\u0430, \u043F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u0447\u0435\u0440\u0435\u0437 \u043C\u0438\u043D\u0443\u0442\u0443."
        });
      }
      res.status(502).json({ error: e?.message || "AI request failed" });
    }
  });
  app2.get("/api/gemini/magomed-history", async (req, res) => {
    const session = getSession2(req);
    const threadKey = threadKeyOf(req, session);
    try {
      const messages = await loadMagomedHistory(session.organizationId, threadKey);
      res.json({ messages });
    } catch {
      res.json({ messages: [] });
    }
  });
}

// api/__entry.ts
var app = express();
app.use(express.json());
registerMvpApi(app);
registerGeminiApi(app);
registerMagomedApi(app);
var entry_default = app;
export {
  entry_default as default
};
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Точка входа для Vercel Serverless (api/[...path]).
 * Бандлится в api/[...path].js: `npm run build:api`.
 */
