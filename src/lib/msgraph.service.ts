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
  private readonly teamSubject: string;

  constructor(private readonly configService: ConfigService) {
    this.tenantId = configService.get('TENANT_ID');
    this.clientId = configService.get('CLIENT_ID');
    this.clientSecret = configService.get('CLIENT_SECRET');
    this.baseUrl = 'https://graph.microsoft.com/v1.0';
    this.teamSubject = configService.get('TEAM_SUBJECT');
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
      console.log(error.response?.data?.error?.message);
      throw new BadRequestException(
        'Error in Graph API:',
        error.response?.data?.error?.message,
      );
    }
  }

  private async deleteEvent(
    userId: string,
    eventId: string,
    accessToken: string,
  ) {
    try {
      await axios.delete(`${this.baseUrl}/users/${userId}/events/${eventId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
    } catch (error) {
      console.log(error.response?.data?.error?.message);
      throw new BadRequestException(
        'Error in Graph API:',
        error.response?.data?.error?.message,
      );
    }
  }

  async getTimeSlots(projectManagerId: string, teamId: string) {
    try {
      const startDateTime = new Date()
        .toISOString()
        .replace(/T.+Z/, 'T00:00:00.000Z');
      const endDateTime = new Date(
        Date.now() + 7 * 24 * 60 * 60 * 1000,
      ).toISOString();
      const accessToken = await this.getAccessToken();
      // single response method
      // const response = await axios.get(
      //   `${this.baseUrl}/users/{${projectManagerId}}/calendar/calendarView?startDateTime=${startDateTime}&endDateTime=${endDateTime}&top=100`,
      //   {
      //     headers: {
      //       Authorization: `Bearer ${accessToken}`,
      //       Prefer: 'outlook.timezone="Asia/Kolkata"',
      //     },
      //   },
      // );
      let allEvents = [];
      let nextLink = null;

      let currentUrl = `${this.baseUrl}/users/${projectManagerId}/calendar/calendarView?startDateTime=${startDateTime}&endDateTime=${endDateTime}&top=100`;
      do {
        try {
          const response = await axios.get(currentUrl, {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              Prefer: 'outlook.timezone="Asia/Kolkata"',
            },
          });

          if (response.data.value) {
            allEvents = [...allEvents, ...response.data.value];
          }
          nextLink = response.data['@odata.nextLink'];
          currentUrl = nextLink;
        } catch (error) {
          console.log(error.response?.data?.error?.message);
          throw new BadRequestException(
            'Error in Graph API:',
            error.response?.data?.error?.message,
          );
        }
      } while (nextLink);
      const timeSlots = allEvents
        .filter(
          (i) =>
            i.categories.length === 1 &&
            i.categories[0] === teamId &&
            i.subject.startsWith(this.teamSubject),
        )
        .map((event) => {
          return {
            id: event.id,
            start: event.start.dateTime,
            end: event.end.dateTime,
            available: true,
          };
        });
      return timeSlots;
    } catch (error) {
      console.log(error.response?.data?.error?.message);
      throw new BadRequestException(
        'Error in Graph API:',
        error.response?.data?.error?.message,
      );
    }
  }

  async createBookingWithProjectManger(createBookingDto: CreateBookingDto) {
    try {
      const accessToken = await this.getAccessToken();
      const response = await axios.post(
        `${this.baseUrl}/users/${createBookingDto.projectManagerId}/calendar/events`,
        {
          subject: `1:1 with Project Manager ${createBookingDto.projectManagerName} with Student ${createBookingDto.studentName}`,
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
        accessToken,
      );
      return response.data;
    } catch (error) {
      console.log(error.response?.data?.error?.message);
      throw new BadRequestException(
        'Error in Graph API:',
        error.response?.data?.error?.message,
      );
    }
  }

  async createBookingWindow(
    timeSlots: {
      startDateTime: string;
      endDateTime: string;
    }[],
    teamName: string,
    teamId: string,
    projectManagerId: string,
  ) {
    const accessToken = await this.getAccessToken();
    for (const ts of timeSlots) {
      try {
        await axios.post(
          `${this.baseUrl}/users/${projectManagerId}/calendar/events`,
          {
            subject: `${this.teamSubject}${teamName}`,
            start: {
              dateTime: ts.startDateTime,
              timeZone: 'Asia/Kolkata',
            },
            end: {
              dateTime: ts.endDateTime,
              timeZone: 'Asia/Kolkata',
            },
            categories: [teamId],
            showAs: 'free',
          },
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          },
        );
      } catch (error) {
        console.log(error.response?.data?.error?.message);
        throw new BadRequestException(
          'Error in Graph API:',
          error.response?.data?.error?.message,
        );
      }
    }
  }

  async rescheduleEvent(
    startDateTime: string,
    endDateTime: string,
    eventId: string,
    projectManagerId: string,
  ) {
    try {
      const accessToken = await this.getAccessToken();
      const response = await axios.patch(
        `${this.baseUrl}/users/${projectManagerId}/calendar/events/${eventId}`,
        {
          start: {
            dateTime: startDateTime,
            timeZone: 'Asia/Kolkata',
          },
          end: {
            dateTime: endDateTime,
            timeZone: 'Asia/Kolkata',
          },
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );
      return response.data;
    } catch (error) {
      console.log(error.response?.data?.error?.message);
      throw new BadRequestException(
        'Error in Graph API:',
        error.response?.data?.error?.message,
      );
    }
  }

  async removeAttendeesFromEvent(
    eventId: string,
    projectManagerId: string,
    teamName: string,
    teamId: string,
  ) {
    try {
      const accessToken = await this.getAccessToken();
      const response = await axios.patch(
        `${this.baseUrl}/users/${projectManagerId}/calendar/events/${eventId}`,
        {
          subject: `${this.teamSubject}${teamName}`,
          attendees: [],
          categories: [teamId],
          showAs: 'free',
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );
      return response.data;
    } catch (error) {
      console.log(error.response?.data?.error?.message);
      throw new BadRequestException(
        'Error in Graph API:',
        error.response?.data?.error?.message,
      );
    }
  }
}
