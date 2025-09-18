import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }
  try {
    const { jobData, selectedTechnicians, selectedAttendees, adminEmails } =
      await req.json();
    // Google credentials
    const googleClientId = Deno.env.get("GOOGLE_CLIENT_ID");
    const googleClientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");
    const googleRefreshToken = Deno.env.get("GOOGLE_REFRESH_TOKEN");
    if (!googleClientId || !googleClientSecret || !googleRefreshToken) {
      throw new Error(
        "Google Calendar API credentials not configured. Please set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REFRESH_TOKEN environment variables."
      );
    }
    // Refresh access token
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
    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok) {
      console.error("Google OAuth Error:", tokenData);
      throw new Error(
        `Failed to get Google access token: ${
          tokenData.error_description || tokenData.error || "Unknown error"
        }`
      );
    }
    const accessToken = tokenData.access_token;
    // Normalize attendees
    const normalize = (item) =>
      typeof item === "string"
        ? {
            email: item,
            name: item.split("@")[0],
          }
        : item;
    const allEmails = [
      ...adminEmails.map(normalize),
      ...selectedTechnicians.map(normalize),
    ];
    const attendees = allEmails
      .filter((p) => selectedAttendees.includes(p.email))
      .map((p) => ({
        email: p.email,
        displayName: p.name,
      }));
    console.log("=== FINAL ATTENDEE LIST (REQUEST) ===", attendees);
    // Primary technician scheduling
    const primaryTechnician = selectedTechnicians.find((t) => t.scheduledTime);
    const scheduledTime = primaryTechnician?.scheduledTime;
    const formatDateForGoogle = (dateString, timeString) => {
      let date;
      if (timeString) {
        const [hours, minutes] = timeString.split(":").map(Number);
        const [year, month, day] = dateString.split("-").map(Number);
        date = new Date(year, month - 1, day, hours, minutes);
      } else {
        date = new Date(dateString);
      }
      return date.toISOString();
    };
    const startDateTime = formatDateForGoogle(jobData.startDate, scheduledTime);
    const endDateTime = formatDateForGoogle(jobData.dueDate, scheduledTime);
    // Event description
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
    if (selectedTechnicians.length > 0) {
      description += `\n\nAssigned Technicians:`;
      selectedTechnicians.forEach((tech) => {
        if (tech.scheduledTime) {
          const [hours, minutes] = tech.scheduledTime.split(":");
          const timeStr = new Date(
            2000,
            0,
            1,
            +hours,
            +minutes
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
    // Event payload
    const event = {
      summary: `${jobData.address} - ${jobData.jobType}`,
      description: description.trim(),
      start: {
        dateTime: startDateTime,
        timeZone: "America/New_York",
      },
      end: {
        dateTime: endDateTime,
        timeZone: "America/New_York",
      },
      location: jobData.address,
      attendees,
      guestsCanModify: false,
      guestsCanInviteOthers: false,
      guestsCanSeeOtherGuests: true,
    };
    console.log(
      "=== EVENT PAYLOAD SENT TO GOOGLE ===",
      JSON.stringify(event, null, 2)
    );
    // Send to Calendar API (force notifications)
    const calendarResponse = await fetch(
      "https://www.googleapis.com/calendar/v3/calendars/primary/events?sendUpdates=all&sendNotifications=true",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(event),
      }
    );
    const calendarData = await calendarResponse.json();
    if (!calendarResponse.ok) {
      throw new Error(
        `Google Calendar API error: ${JSON.stringify(calendarData)}`
      );
    }
    // ✅ Success logging: show which emails Google accepted
    if (calendarData.attendees) {
      console.log("=== INVITE EMAILS SENT (FROM GOOGLE) ===");
      calendarData.attendees.forEach((attendee, i) => {
        console.log(
          `#${i + 1}: ${attendee.email} (${
            attendee.displayName || "No name"
          }) → status: ${attendee.responseStatus}`
        );
      });
    } else {
      console.log("⚠️ Google did not return an attendees list in the response");
    }
    return new Response(
      JSON.stringify({
        success: true,
        eventId: calendarData.id,
        eventLink: calendarData.htmlLink,
        attendees:
          calendarData.attendees?.map((a) => ({
            email: a.email,
            status: a.responseStatus,
          })) || [],
        message:
          "Google Calendar event created successfully. Check logs to see which emails were sent invitations.",
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
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
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
        status: 500,
      }
    );
  }
});
