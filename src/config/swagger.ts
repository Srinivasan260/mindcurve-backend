import swaggerJsdoc from 'swagger-jsdoc';
import { env } from './env.js';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Athma Mind Care API',
      version: '1.0.0',
      description:
        'REST API for the Athma mental health assessment platform — patient registration, categories, questions, assessments, and admin analytics.',
    },
    servers: [
      {
        url: `http://localhost:${env.port}${env.apiPrefix}`,
        description: 'Local development',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        // ----- Shared error shapes -----
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string', example: 'Invalid email or password' },
          },
        },
        ValidationErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string', example: 'Validation failed' },
            details: {
              type: 'object',
              properties: {
                formErrors: { type: 'array', items: { type: 'string' } },
                fieldErrors: {
                  type: 'object',
                  additionalProperties: {
                    type: 'array',
                    items: { type: 'string' },
                  },
                },
              },
            },
          },
        },

        // ----- Auth: register -----
        RegisterRequest: {
          type: 'object',
          required: [
            'fullName',
            'email',
            'password',
            'confirmPassword',
            'phone',
            'address',
            'city',
            'state',
            'pincode',
            'consent',
          ],
          properties: {
            fullName: { type: 'string', example: 'John Doe' },
            email: { type: 'string', format: 'email', example: 'john@example.com' },
            password: { type: 'string', format: 'password', minLength: 8, example: 'Password123' },
            confirmPassword: { type: 'string', format: 'password', example: 'Password123' },
            phone: { type: 'string', example: '9876543210' },
            age: { type: 'integer', example: 28 },
            gender: { type: 'string', enum: ['male', 'female', 'other'] },
            address: { type: 'string', example: '42 Park Street' },
            city: { type: 'string', example: 'Chennai' },
            state: { type: 'string', example: 'Tamil Nadu' },
            pincode: { type: 'string', example: '600001' },
            location: { type: 'string', example: 'Anna Nagar' },
            maritalStatus: { type: 'string', enum: ['single', 'married', 'other'] },
            education: { type: 'string', example: 'BTech' },
            occupation: { type: 'string', example: 'Engineer' },
            referredBy: { type: 'string', example: 'Dr. Smith' },
            consent: { type: 'boolean', example: true },
          },
        },
        RegisterResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: {
              type: 'string',
              example: 'Registration successful. Check your email for the login link.',
            },
            data: {
              type: 'object',
              properties: {
                userId: { type: 'string', format: 'uuid' },
                email: { type: 'string', format: 'email' },
              },
            },
          },
        },

        // ----- Patient assessment flow -----
        PatientQuestionOption: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            text: { type: 'string', example: 'Several days' },
            displayOrder: { type: 'integer', example: 1 },
          },
        },
        PatientQuestion: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            questionText: { type: 'string' },
            questionType: {
              type: 'string',
              enum: ['single_choice', 'multi_choice', 'scale'],
            },
            displayOrder: { type: 'integer' },
            isRequired: { type: 'boolean' },
            options: {
              type: 'array',
              items: { $ref: '#/components/schemas/PatientQuestionOption' },
            },
          },
        },
        AssessmentStartResult: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            status: { type: 'string', enum: ['in_progress', 'completed', 'abandoned'] },
            startedAt: { type: 'string', format: 'date-time' },
            category: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                name: { type: 'string' },
                slug: { type: 'string' },
              },
            },
          },
        },
        AnswerSubmitRequest: {
          type: 'object',
          required: ['questionId', 'selectedOptionId'],
          properties: {
            questionId: { type: 'string', format: 'uuid' },
            selectedOptionId: { type: 'string', format: 'uuid' },
          },
        },
        Answer: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            questionId: { type: 'string', format: 'uuid' },
            selectedOptionId: { type: 'string', format: 'uuid' },
            scoreSnapshot: { type: 'integer', example: 2 },
            answeredAt: { type: 'string', format: 'date-time' },
          },
        },
        SubscaleResult: {
          type: 'object',
          properties: {
            subscale: {
              type: 'string',
              nullable: true,
              description: 'Null for total-scoring. Otherwise the subscale/trait name (e.g. "panic", "extraversion").',
            },
            totalScore: {
              type: 'number',
              description: 'Sum for total/subscale_sum_cutoff; mean for subscale_mean_band.',
              example: 2.5,
            },
            riskLevel: {
              type: 'string',
              description: 'Label from the matched risk band. Varies by scoring type (e.g. "mild", "flagged", "very_high").',
              example: 'low',
            },
          },
        },
        AssessmentSubmitResult: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            status: { type: 'string', enum: ['in_progress', 'completed', 'abandoned'] },
            startedAt: { type: 'string', format: 'date-time' },
            completedAt: { type: 'string', format: 'date-time', nullable: true },
            overallRiskLevel: {
              type: 'string',
              nullable: true,
              description: 'Only set for total-scoring categories; null for subscale-based.',
            },
            category: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                name: { type: 'string' },
                slug: { type: 'string' },
              },
            },
            scoringType: {
              type: 'string',
              enum: ['total', 'subscale_sum_cutoff', 'subscale_mean_band'],
            },
            results: {
              type: 'array',
              description: '1 row for total-scoring; N rows (one per subscale/trait) for subscale-based.',
              items: { $ref: '#/components/schemas/SubscaleResult' },
            },
            answersCount: { type: 'integer', example: 4 },
          },
        },
        AssessmentSummary: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            status: { type: 'string', enum: ['in_progress', 'completed', 'abandoned'] },
            overallRiskLevel: { type: 'string', nullable: true },
            startedAt: { type: 'string', format: 'date-time' },
            completedAt: { type: 'string', format: 'date-time', nullable: true },
            category: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                name: { type: 'string' },
                slug: { type: 'string' },
              },
            },
            results: {
              type: 'array',
              items: { $ref: '#/components/schemas/SubscaleResult' },
            },
          },
        },
        AssessmentDetail: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            status: { type: 'string', enum: ['in_progress', 'completed', 'abandoned'] },
            startedAt: { type: 'string', format: 'date-time' },
            completedAt: { type: 'string', format: 'date-time', nullable: true },
            overallRiskLevel: { type: 'string', nullable: true },
            category: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                name: { type: 'string' },
                slug: { type: 'string' },
              },
            },
            answers: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  questionId: { type: 'string', format: 'uuid' },
                  selectedOptionId: { type: 'string', format: 'uuid' },
                  scoreSnapshot: { type: 'integer' },
                  answeredAt: { type: 'string', format: 'date-time' },
                },
              },
            },
            results: {
              type: 'array',
              items: { $ref: '#/components/schemas/SubscaleResult' },
            },
          },
        },

        // ----- Category (patient-facing slim DTO) -----
        PatientCategory: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string', example: 'Depression Screening' },
            slug: { type: 'string', example: 'depression-screening' },
            description: { type: 'string', nullable: true },
            questionCount: { type: 'integer', example: 4 },
          },
        },

        // ----- Category (admin) -----
        Category: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string', example: 'Depression Screening' },
            slug: { type: 'string', example: 'depression-screening' },
            description: { type: 'string', nullable: true },
            scoringType: {
              type: 'string',
              enum: ['total', 'subscale_sum_cutoff', 'subscale_mean_band'],
              example: 'total',
            },
            displayOrder: { type: 'integer', example: 1 },
            isActive: { type: 'boolean', example: true },
            createdBy: { type: 'string', format: 'uuid' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        CategoryCreateRequest: {
          type: 'object',
          required: ['name'],
          properties: {
            name: { type: 'string', example: 'Depression Screening' },
            slug: {
              type: 'string',
              description: 'Optional. Auto-generated from name if omitted.',
              example: 'depression-screening',
            },
            description: { type: 'string', example: 'PHQ-9 based depression screening.' },
            scoringType: {
              type: 'string',
              enum: ['total', 'subscale_sum_cutoff', 'subscale_mean_band'],
              default: 'total',
              description:
                'total = sum all (ISAA-style); subscale_sum_cutoff = SCARED-style; subscale_mean_band = BFI-10-style with reverse scoring',
            },
            displayOrder: { type: 'integer', example: 1, default: 0 },
            isActive: { type: 'boolean', example: true, default: true },
          },
        },
        CategoryUpdateRequest: {
          type: 'object',
          description: 'All fields optional; at least one must be provided.',
          properties: {
            name: { type: 'string' },
            slug: { type: 'string' },
            description: { type: 'string' },
            scoringType: {
              type: 'string',
              enum: ['total', 'subscale_sum_cutoff', 'subscale_mean_band'],
            },
            displayOrder: { type: 'integer' },
            isActive: { type: 'boolean' },
          },
        },

        // ----- Shared pagination -----
        Pagination: {
          type: 'object',
          properties: {
            page: { type: 'integer', example: 1 },
            pageSize: { type: 'integer', example: 20 },
            total: { type: 'integer', example: 157 },
            totalPages: { type: 'integer', example: 8 },
          },
        },

        // ----- Shared activity log entry -----
        ActivityLogEntry: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            action: { type: 'string' },
            entityType: { type: 'string', nullable: true },
            entityId: { type: 'string', nullable: true },
            metadata: { type: 'object', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
            actor: {
              type: 'object',
              nullable: true,
              properties: {
                id: { type: 'string', format: 'uuid' },
                email: { type: 'string', format: 'email' },
                role: { type: 'string', enum: ['patient', 'admin', 'doctor'] },
                fullName: { type: 'string', nullable: true },
              },
            },
          },
        },

        // ----- Admin: Patients -----
        AdminPatientSummary: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            fullName: { type: 'string' },
            email: { type: 'string', format: 'email' },
            phone: { type: 'string' },
            age: { type: 'integer', nullable: true },
            gender: { type: 'string', enum: ['male', 'female', 'other'], nullable: true },
            city: { type: 'string' },
            state: { type: 'string' },
            registeredAt: { type: 'string', format: 'date-time' },
            isEmailVerified: { type: 'boolean' },
            isActive: { type: 'boolean' },
            lastLoginAt: { type: 'string', format: 'date-time', nullable: true },
            assessmentsCount: { type: 'integer', example: 3 },
            lastAssessment: {
              type: 'object',
              nullable: true,
              properties: {
                startedAt: { type: 'string', format: 'date-time' },
                completedAt: { type: 'string', format: 'date-time', nullable: true },
                status: { type: 'string', enum: ['in_progress', 'completed', 'abandoned'] },
                overallRiskLevel: { type: 'string', nullable: true },
              },
            },
          },
        },
        AdminPatientDetail: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            fullName: { type: 'string' },
            email: { type: 'string', format: 'email' },
            phone: { type: 'string' },
            age: { type: 'integer', nullable: true },
            gender: { type: 'string', nullable: true },
            address: { type: 'string' },
            city: { type: 'string' },
            state: { type: 'string' },
            pincode: { type: 'string' },
            location: { type: 'string', nullable: true },
            maritalStatus: { type: 'string', nullable: true },
            education: { type: 'string', nullable: true },
            occupation: { type: 'string', nullable: true },
            referredBy: { type: 'string', nullable: true },
            consentAcceptedAt: { type: 'string', format: 'date-time' },
            consentVersion: { type: 'string' },
            user: {
              type: 'object',
              properties: {
                email: { type: 'string', format: 'email' },
                isEmailVerified: { type: 'boolean' },
                isActive: { type: 'boolean' },
                lastLoginAt: { type: 'string', format: 'date-time', nullable: true },
                joinedAt: { type: 'string', format: 'date-time' },
              },
            },
            stats: {
              type: 'object',
              properties: {
                assessmentsCount: { type: 'integer' },
                clinicalNotesCount: { type: 'integer' },
                followUpsCount: { type: 'integer' },
              },
            },
            recentAssessments: {
              type: 'array',
              items: { $ref: '#/components/schemas/AssessmentSummary' },
            },
            recentNotes: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string', format: 'uuid' },
                  content: { type: 'string' },
                  createdAt: { type: 'string', format: 'date-time' },
                  author: {
                    type: 'object',
                    properties: {
                      id: { type: 'string', format: 'uuid' },
                      email: { type: 'string', format: 'email' },
                      role: { type: 'string', enum: ['patient', 'admin', 'doctor'] },
                    },
                  },
                },
              },
            },
          },
        },

        // ----- Admin: Assessments -----
        AdminAssessmentSummary: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            status: { type: 'string', enum: ['in_progress', 'completed', 'abandoned'] },
            overallRiskLevel: { type: 'string', nullable: true },
            startedAt: { type: 'string', format: 'date-time' },
            completedAt: { type: 'string', format: 'date-time', nullable: true },
            category: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                name: { type: 'string' },
                slug: { type: 'string' },
                scoringType: { type: 'string' },
              },
            },
            patient: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                fullName: { type: 'string' },
                email: { type: 'string', format: 'email' },
              },
            },
            results: {
              type: 'array',
              items: { $ref: '#/components/schemas/SubscaleResult' },
            },
          },
        },
        AdminAssessmentDetail: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            status: { type: 'string', enum: ['in_progress', 'completed', 'abandoned'] },
            overallRiskLevel: { type: 'string', nullable: true },
            startedAt: { type: 'string', format: 'date-time' },
            completedAt: { type: 'string', format: 'date-time', nullable: true },
            category: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                name: { type: 'string' },
                slug: { type: 'string' },
                scoringType: { type: 'string' },
              },
            },
            patient: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                fullName: { type: 'string' },
                phone: { type: 'string' },
                city: { type: 'string' },
                email: { type: 'string', format: 'email' },
              },
            },
            answers: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string', format: 'uuid' },
                  scoreSnapshot: { type: 'integer' },
                  answeredAt: { type: 'string', format: 'date-time' },
                  question: {
                    type: 'object',
                    properties: {
                      id: { type: 'string', format: 'uuid' },
                      questionText: { type: 'string' },
                      subscale: { type: 'string', nullable: true },
                      isReverseScored: { type: 'boolean' },
                      displayOrder: { type: 'integer' },
                    },
                  },
                  selectedOption: {
                    type: 'object',
                    properties: {
                      id: { type: 'string', format: 'uuid' },
                      optionText: { type: 'string' },
                      score: { type: 'integer' },
                      displayOrder: { type: 'integer' },
                    },
                  },
                },
              },
            },
            results: {
              type: 'array',
              items: { $ref: '#/components/schemas/SubscaleResult' },
            },
          },
        },

        // ----- Clinical Notes (admin) -----
        ClinicalNote: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            content: { type: 'string' },
            assessmentId: { type: 'string', format: 'uuid', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
            author: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                email: { type: 'string', format: 'email' },
                role: { type: 'string', enum: ['patient', 'admin', 'doctor'] },
              },
            },
          },
        },
        ClinicalNoteCreateRequest: {
          type: 'object',
          required: ['content'],
          properties: {
            content: { type: 'string', example: 'Patient reports improved sleep this week.' },
            assessmentId: {
              type: 'string',
              format: 'uuid',
              nullable: true,
              description: 'Optional — link this note to a specific assessment.',
            },
          },
        },

        // ----- Follow-ups (admin) -----
        FollowUp: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            status: { type: 'string', enum: ['pending', 'contacted', 'done', 'no_response'] },
            priority: { type: 'string', enum: ['low', 'medium', 'high'] },
            scheduledAt: { type: 'string', format: 'date-time', nullable: true },
            completedAt: { type: 'string', format: 'date-time', nullable: true },
            notes: { type: 'string', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
            assessmentId: { type: 'string', format: 'uuid', nullable: true },
            patient: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                fullName: { type: 'string' },
                email: { type: 'string', format: 'email' },
              },
            },
            assignee: {
              type: 'object',
              nullable: true,
              properties: {
                id: { type: 'string', format: 'uuid' },
                email: { type: 'string', format: 'email' },
                role: { type: 'string', enum: ['patient', 'admin', 'doctor'] },
              },
            },
          },
        },
        FollowUpCreateRequest: {
          type: 'object',
          properties: {
            assessmentId: { type: 'string', format: 'uuid', nullable: true },
            assignedTo: { type: 'string', format: 'uuid', nullable: true },
            priority: { type: 'string', enum: ['low', 'medium', 'high'], default: 'medium' },
            status: {
              type: 'string',
              enum: ['pending', 'contacted', 'done', 'no_response'],
              default: 'pending',
            },
            scheduledAt: { type: 'string', format: 'date-time', nullable: true },
            notes: { type: 'string', nullable: true },
          },
        },
        FollowUpUpdateRequest: {
          type: 'object',
          description: 'All fields optional; at least one required. When `status` becomes "done", `completedAt` is auto-stamped unless you supply one.',
          properties: {
            assessmentId: { type: 'string', format: 'uuid', nullable: true },
            assignedTo: { type: 'string', format: 'uuid', nullable: true },
            priority: { type: 'string', enum: ['low', 'medium', 'high'] },
            status: { type: 'string', enum: ['pending', 'contacted', 'done', 'no_response'] },
            scheduledAt: { type: 'string', format: 'date-time', nullable: true },
            completedAt: { type: 'string', format: 'date-time', nullable: true },
            notes: { type: 'string', nullable: true },
          },
        },

        // ----- Dashboard (admin) -----
        DashboardSummary: {
          type: 'object',
          properties: {
            kpis: {
              type: 'object',
              properties: {
                assessmentsThisWeek: {
                  type: 'object',
                  properties: {
                    count: { type: 'integer' },
                    previousWeekCount: { type: 'integer' },
                    changePercent: { type: 'integer' },
                  },
                },
                registeredPatients: {
                  type: 'object',
                  properties: {
                    total: { type: 'integer' },
                    addedThisMonth: { type: 'integer' },
                  },
                },
                highRiskFollowUps: {
                  type: 'object',
                  properties: {
                    total: { type: 'integer' },
                    pendingCallback: { type: 'integer' },
                  },
                },
                riskDistribution: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      level: { type: 'string' },
                      count: { type: 'integer' },
                      percent: { type: 'integer' },
                    },
                  },
                },
              },
            },
            assessmentsByDay: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  day: { type: 'string', format: 'date' },
                  count: { type: 'integer' },
                },
              },
            },
            riskByCategory: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  categoryId: { type: 'string', format: 'uuid' },
                  categoryName: { type: 'string' },
                  counts: { type: 'object', additionalProperties: { type: 'integer' } },
                  total: { type: 'integer' },
                },
              },
            },
            activity: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string', format: 'uuid' },
                  action: { type: 'string' },
                  entityType: { type: 'string', nullable: true },
                  entityId: { type: 'string', nullable: true },
                  metadata: { type: 'object', nullable: true },
                  createdAt: { type: 'string', format: 'date-time' },
                  actor: {
                    type: 'object',
                    nullable: true,
                    properties: {
                      id: { type: 'string', format: 'uuid' },
                      email: { type: 'string', format: 'email' },
                      role: { type: 'string', enum: ['patient', 'admin', 'doctor'] },
                      fullName: { type: 'string', nullable: true },
                    },
                  },
                },
              },
            },
          },
        },

        // ----- Risk Bands (admin) -----
        RiskBand: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            categoryId: { type: 'string', format: 'uuid' },
            subscale: {
              type: 'string',
              nullable: true,
              description: 'Null for total-scoring categories; the subscale/trait name otherwise.',
            },
            level: {
              type: 'string',
              example: 'mild',
              description: 'Band label such as low/moderate/high, no_autism/mild/moderate/severe, very_low/low/average/high/very_high, or flagged/normal.',
            },
            minScore: { type: 'number', example: 70 },
            maxScore: { type: 'number', example: 106 },
            label: { type: 'string', nullable: true, example: 'Mild Autism' },
            color: { type: 'string', nullable: true, example: '#F5A623' },
          },
        },
        RiskBandCreateRequest: {
          type: 'object',
          required: ['level', 'minScore', 'maxScore'],
          properties: {
            subscale: { type: 'string', nullable: true, example: 'panic' },
            level: { type: 'string', example: 'flagged' },
            minScore: { type: 'number', example: 7 },
            maxScore: { type: 'number', example: 9999 },
            label: { type: 'string', example: 'Possible Panic/Somatic' },
            color: { type: 'string', example: '#D0021B' },
          },
        },
        RiskBandUpdateRequest: {
          type: 'object',
          description: 'All fields optional; at least one must be provided.',
          properties: {
            subscale: { type: 'string', nullable: true },
            level: { type: 'string' },
            minScore: { type: 'number' },
            maxScore: { type: 'number' },
            label: { type: 'string' },
            color: { type: 'string' },
          },
        },
        RiskBandBulkReplaceRequest: {
          type: 'object',
          required: ['bands'],
          properties: {
            subscale: {
              type: 'string',
              nullable: true,
              description: 'Optional. When provided, only this subscale’s bands are replaced. Otherwise all bands for the category are replaced.',
            },
            bands: {
              type: 'array',
              minItems: 1,
              items: { $ref: '#/components/schemas/RiskBandCreateRequest' },
            },
          },
        },

        // ----- Question (admin) -----
        QuestionOption: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            questionId: { type: 'string', format: 'uuid' },
            optionText: { type: 'string', example: 'Not at all' },
            score: { type: 'integer', example: 0 },
            displayOrder: { type: 'integer', example: 0 },
          },
        },
        Question: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            categoryId: { type: 'string', format: 'uuid' },
            questionText: { type: 'string', example: 'Little interest or pleasure in doing things?' },
            questionType: {
              type: 'string',
              enum: ['single_choice', 'multi_choice', 'scale'],
              example: 'single_choice',
            },
            subscale: {
              type: 'string',
              nullable: true,
              example: 'panic',
              description: 'Subscale/trait tag used by SCARED-/BFI-style scoring. Null for simple-total tests.',
            },
            isReverseScored: {
              type: 'boolean',
              default: false,
              description: 'If true, the option score is flipped at answer time: (maxScore + minScore) - rawScore',
            },
            displayOrder: { type: 'integer', example: 1 },
            isRequired: { type: 'boolean', example: true },
            isActive: { type: 'boolean', example: true },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
            options: {
              type: 'array',
              items: { $ref: '#/components/schemas/QuestionOption' },
            },
          },
        },
        QuestionOptionInput: {
          type: 'object',
          required: ['text', 'score'],
          properties: {
            text: { type: 'string', example: 'Not at all' },
            score: { type: 'integer', example: 0 },
            displayOrder: { type: 'integer', example: 0 },
          },
        },
        QuestionCreateRequest: {
          type: 'object',
          required: ['questionText', 'options'],
          properties: {
            questionText: {
              type: 'string',
              example: 'Little interest or pleasure in doing things?',
            },
            questionType: {
              type: 'string',
              enum: ['single_choice', 'multi_choice', 'scale'],
              default: 'single_choice',
            },
            subscale: {
              type: 'string',
              nullable: true,
              example: 'panic',
              description: 'Tag this question with a subscale/trait name. Required for SCARED-/BFI-style categories.',
            },
            isReverseScored: {
              type: 'boolean',
              default: false,
              description: 'Only used by subscale_mean_band scoring (BFI-10-style).',
            },
            displayOrder: { type: 'integer', example: 1 },
            isRequired: { type: 'boolean', default: true },
            isActive: { type: 'boolean', default: true },
            options: {
              type: 'array',
              minItems: 2,
              maxItems: 7,
              items: { $ref: '#/components/schemas/QuestionOptionInput' },
              example: [
                { text: 'Not at all', score: 0 },
                { text: 'Several days', score: 1 },
                { text: 'More than half the days', score: 2 },
                { text: 'Nearly every day', score: 3 },
              ],
            },
          },
        },
        QuestionUpdateRequest: {
          type: 'object',
          description:
            'All fields optional; at least one required. If `options` is provided, the entire option set is REPLACED.',
          properties: {
            questionText: { type: 'string' },
            questionType: {
              type: 'string',
              enum: ['single_choice', 'multi_choice', 'scale'],
            },
            subscale: { type: 'string', nullable: true },
            isReverseScored: { type: 'boolean' },
            displayOrder: { type: 'integer' },
            isRequired: { type: 'boolean' },
            isActive: { type: 'boolean' },
            options: {
              type: 'array',
              minItems: 2,
              maxItems: 7,
              items: { $ref: '#/components/schemas/QuestionOptionInput' },
            },
          },
        },

        // ----- Auth: magic login -----
        MagicLoginRequest: {
          type: 'object',
          required: ['token'],
          properties: {
            token: {
              type: 'string',
              description: 'The raw token from the magic-link URL query string.',
              example: 'a1b2c3d4e5f6...(64-char hex)',
            },
          },
        },

        // ----- Auth: login -----
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email', example: 'john@example.com' },
            password: { type: 'string', format: 'password', example: 'Password123' },
          },
        },
        LoginResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Login successful.' },
            data: {
              type: 'object',
              properties: {
                token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5c...' },
                user: {
                  type: 'object',
                  properties: {
                    id: { type: 'string', format: 'uuid' },
                    email: { type: 'string', format: 'email' },
                    role: { type: 'string', enum: ['patient', 'admin', 'doctor'] },
                    fullName: { type: 'string', nullable: true },
                    isEmailVerified: { type: 'boolean' },
                  },
                },
              },
            },
          },
        },
      },
    },
    tags: [
      { name: 'Health', description: 'Service health checks' },
      { name: 'Auth', description: 'Patient authentication & session' },
      { name: 'Admin · Auth', description: 'Admin / doctor authentication' },
      { name: 'Categories', description: 'Patient-facing category list and questions' },
      { name: 'Assessments', description: 'Patient assessment flow (start, answer, submit)' },
      { name: 'Admin · Categories', description: 'Admin-only category CRUD' },
      { name: 'Admin · Questions', description: 'Admin-only question + option CRUD' },
      { name: 'Admin · Risk Bands', description: 'Admin-only risk band / cutoff configuration' },
      { name: 'Admin · Patients', description: 'Admin patient directory + detail' },
      { name: 'Admin · Assessments', description: 'Admin view of patient assessments' },
      { name: 'Admin · Clinical Notes', description: 'Admin clinical notes CRUD' },
      { name: 'Admin · Follow-ups', description: 'Admin follow-up queue management' },
      { name: 'Admin · Dashboard', description: 'Admin dashboard analytics' },
    ],
  },
  apis: ['./src/modules/**/*.route.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
