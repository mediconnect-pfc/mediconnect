import { Test, TestingModule } from '@nestjs/testing'
import { ConfigService } from '@nestjs/config'
import { GomobileService } from './gomobile.service'

describe('GomobileService', () => {
  let service: GomobileService
  let moduleRef: TestingModule

  afterEach(async () => {
    await moduleRef?.close()
  })

  it('isCallConfigured returns false when env vars are missing', async () => {
    moduleRef = await Test.createTestingModule({
      providers: [
        GomobileService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'GOMOBILE_API_URL') return ''
              if (key === 'GOMOBILE_API_KEY') return ''
              if (key === 'GOMOBILE_SENDER_ID') return ''
              if (key === 'GOMOBILE_FLOW_ID_H24') return ''
              if (key === 'GOMOBILE_DID_ID') return ''
              return ''
            }),
          },
        },
      ],
    }).compile()

    service = moduleRef.get(GomobileService)

    expect(service.isCallConfigured()).toBe(false)
  })

  it('isSmsConfigured returns true when env vars are present', async () => {
    moduleRef = await Test.createTestingModule({
      providers: [
        GomobileService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'GOMOBILE_API_URL') return 'https://api.gomobile.test'
              if (key === 'GOMOBILE_API_KEY') return 'api-key'
              if (key === 'GOMOBILE_SENDER_ID') return 'CLINIQUE'
              if (key === 'GOMOBILE_FLOW_ID_H24') return ''
              if (key === 'GOMOBILE_DID_ID') return ''
              return ''
            }),
          },
        },
      ],
    }).compile()

    service = moduleRef.get(GomobileService)

    expect(service.isSmsConfigured()).toBe(true)
  })
})
