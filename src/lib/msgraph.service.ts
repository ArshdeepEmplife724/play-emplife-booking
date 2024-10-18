import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { CreateBookingDto } from 'src/booking/dtos';

@Injectable()
export class MsGraphService {
  private readonly tenantId: string;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly baseUrl: string;
  private readonly subject: string;

  constructor(private readonly configService: ConfigService) {
    this.tenantId = configService.get('TENANT_ID');
    this.clientId = configService.get('CLIENT_ID');
    this.clientSecret = configService.get('CLIENT_SECRET');
    this.baseUrl = 'https://graph.microsoft.com/v1.0';
    this.subject = configService.get('SUBJECT');
  }

  private async getAccessToken() {
    try {
      const response = await axios.post(
        `https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0/token`,
        {
          client_id: this.clientId,
          client_secret: this.clientSecret,
          grant_type: 'client_credentials',
          scope: 'https://graph.microsoft.com/.default',
        },
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );
      return response.data.access_token;
    } catch (error) {
      console.log(error);
      throw new BadRequestException('Error in Graph API:', error);
    }
  }

  private async deleteEvent(userId: string, eventId: string) {
    try {
      const accessToken = await this.getAccessToken();
      await axios.delete(
        `${this.baseUrl}/users/{${userId}}/events/${eventId}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );
    } catch (error) {
      console.log(error);
      throw new BadRequestException('Error in Graph API:', error);
    }
  }

  async getAvailableTimeSlots(projectManagerId: string) {
    try {
      const startDateTime = new Date().toISOString();
      const endDateTime = new Date(
        Date.now() + 7 * 24 * 60 * 60 * 1000,
      ).toISOString();
      const accessToken = await this.getAccessToken();
      const response = await axios.get(
        `${this.baseUrl}/users/{${projectManagerId}}/calendar/calendarView?startDateTime=${startDateTime}&endDateTime=${endDateTime}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Prefer: 'outlook.timezone="Asia/Kolkata"',
          },
        },
      );
      const timeSlots = response.data.value.map((event) => ({
        id: event.id,
        start: event.start.dateTime,
        end: event.end.dateTime,
        available: event.showAs === 'free' && event.subject === this.subject,
      }));
      return timeSlots.filter((ts) => ts.available === true);
    } catch (error) {
      console.log(error);
      throw new BadRequestException('Error in Graph API:', error);
    }
  }

  async createBookingWithProjectManger(createBookingDto: CreateBookingDto) {
    try {
      const accessToken = await this.getAccessToken();
      const response = await axios.post(
        `${this.baseUrl}/users/{${createBookingDto.projectManagerId}}/calendar/events`,
        {
          subject: `1:1 with Project Manager ${createBookingDto.projectManagerName}`,
          start: {
            dateTime: createBookingDto.startDateTime,
            timeZone: 'Asia/Kolkata',
          },
          end: {
            dateTime: createBookingDto.endDateTime,
            timeZone: 'Asia/Kolkata',
          },
          attendees: [
            {
              emailAddress: {
                address: createBookingDto.studentEmail,
                name: 'Attendee',
              },
              type: 'required',
            },
          ],
          isOnlineMeeting: true,
          onlineMeetingProvider: 'teamsForBusiness',
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );
      await this.deleteEvent(
        createBookingDto.projectManagerId,
        createBookingDto.eventId,
      );
      return response.data;
    } catch (error) {
      console.log(error);
      throw new BadRequestException('Error in Graph API:', error);
    }
  }
}
