import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface CalendarEvent {
  summary: string;
  description: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  location: string;
  attendees: Array<{
    email: string;
    displayName?: string;
  }>;
}

interface RequestBody {
  jobData: {
    address: string;
    jobType: string;
    description: string;
    problemDescription: string;
    startDate: string;
    dueDate: string;
    contactName: string;
    contactPhone: string;
    contactEmail: string;
    unitInfo?: string;
    companyName?: string;
    locationName?: string;
  };
  selectedTechnicians: Array<{
    id: string;
    name: string;
    email: string;
    scheduledTime?: string;
  }>;
  selectedAttendees: string[];
  adminEmails: Array<{
    name: string;
    email: string;
  }>;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const {
      jobData,
      selectedTechnicians,
      selectedAttendees,
      adminEmails,
    }: RequestBody = await req.json();

    // Get Google Calendar API credentials from environment
    const googleClientId = Deno.env.get("GOOGLE_CLIENT_ID");
    const googleClientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");
    const googleRefreshToken = Deno.env.get("GOOGLE_REFRESH_TOKEN");

    if (!googleClientId || !googleClientSecret || !googleRefreshToken) {
      throw new Error("Google Calendar API credentials not configured");
    }

    // Get access token using refresh token
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: googleClientId,
        client_secret: googleClientSecret,
        refresh_token: googleRefreshToken,
        grant_type: "refresh_token",
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error("Failed to get Google access token");
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Prepare attendees list
    const allEmails = [...adminEmails, ...selectedTechnicians];
    const attendees = allEmails
      .filter((email) => selectedAttendees.includes(email.email))
      .map((email) => ({
        email: email.email,
        displayName: email.name,
      }));

    // Find primary technician's scheduled time
    const primaryTechnician = selectedTechnicians.find(
      (tech) => tech.scheduledTime
    );
    const scheduledTime = primaryTechnician?.scheduledTime;

    // Format dates for Google Calendar
    const formatDateForGoogle = (dateString: string, timeString?: string) => {
      let date: Date;

      if (timeString) {
        // Use technician scheduled time if available
        const [hours, minutes] = timeString.split(":").map(Number);
        const [year, month, day] = dateString.split("-").map(Number);
        date = new Date(year, month - 1, day, hours, minutes);
      } else {
        // Use default date
        date = new Date(dateString);
      }

      return date.toISOString();
    };

    const startDateTime = formatDateForGoogle(jobData.startDate, scheduledTime);
    const endDateTime = formatDateForGoogle(jobData.dueDate, scheduledTime);

    // Create detailed description
    let description = `Job Details:
- Company: ${jobData.companyName || "N/A"}
- Location: ${jobData.locationName || jobData.address}
- Unit: ${jobData.unitInfo || "N/A"}
- Description: ${jobData.description}
- Problem: ${jobData.problemDescription}
- Customer: ${jobData.contactName}
- Contact: ${jobData.contactPhone} | ${jobData.contactEmail}

Job Type: ${jobData.jobType}
Address: ${jobData.address}`;

    // Add technician schedule information
    if (selectedTechnicians.length > 0) {
      description += `\n\nAssigned Technicians:`;
      selectedTechnicians.forEach((tech) => {
        if (tech.scheduledTime) {
          const [hours, minutes] = tech.scheduledTime.split(":");
          const timeStr = new Date(
            2000,
            0,
            1,
            parseInt(hours),
            parseInt(minutes)
          ).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          });
          description += `\n- ${tech.name}: ${timeStr}`;
        } else {
          description += `\n- ${tech.name}: Time TBD`;
        }
      });
    }

    // Create calendar event
    const event: CalendarEvent = {
      summary: `${jobData.address} - ${jobData.jobType}`,
      description: description.trim(),
      start: {
        dateTime: startDateTime,
        timeZone: "America/New_York", // Adjust timezone as needed
      },
      end: {
        dateTime: endDateTime,
        timeZone: "America/New_York",
      },
      location: jobData.address,
      attendees: attendees,
    };

    // Send event to Google Calendar
    const calendarResponse = await fetch(
      "https://www.googleapis.com/calendar/v3/calendars/primary/events",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(event),
      }
    );

    if (!calendarResponse.ok) {
      const errorData = await calendarResponse.json();
      throw new Error(
        `Google Calendar API error: ${
          errorData.error?.message || "Unknown error"
        }`
      );
    }

    const createdEvent = await calendarResponse.json();

    return new Response(
      JSON.stringify({
        success: true,
        eventId: createdEvent.id,
        eventLink: createdEvent.htmlLink,
        message: "Google Calendar event created successfully",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error creating Google Calendar event:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        message: "Failed to create Google Calendar event",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
