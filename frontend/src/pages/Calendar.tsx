import { useState, useRef, useCallback } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import {
  EventInput,
  DateSelectArg,
  EventClickArg,
  EventDropArg,
  EventContentArg
} from "@fullcalendar/core";
import { Modal } from "../components/ui/modal";
import { useModal } from "../hooks/useModal";
import PageMeta from "../components/common/PageMeta";

const calendarStyles = `
  .custom-calendar .fc-toolbar-title {
    font-size: 1.125rem;
    font-weight: 600;
    color: #1F2937;
  }
  .dark .custom-calendar .fc-toolbar-title {
    color: rgba(255, 255, 255, 0.9);
  }
  .custom-calendar .fc-button {
    background-color: rgb(232, 235, 241);
    border: none;
    color: white;
  }
  .custom-calendar .fc-button:hover {
    background-color: rgb(168, 168, 168);
  }
  .custom-calendar .fc-event {
    cursor: pointer;
    padding: 4px 6px;
    margin: 2px 0;
    min-height: 40px;
  }
  .custom-calendar .fc-daygrid-event {
    white-space: normal;
    word-wrap: break-word;
  }
  .custom-calendar .fc-event-title {
    line-height: 1.2;
    font-weight: 600;
  }
`;

interface CalendarEvent extends EventInput {
  id: string;
  title: string;
  start: string;
  end?: string;
  extendedProps: {
    calendar: "Breakfast" | "Lunch" | "Dinner";
    description?: string;
  };
}

const Calendar: React.FC = () => {
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isViewMode, setIsViewMode] = useState(false);
  const [eventTitle, setEventTitle] = useState("");
  const [eventDescription, setEventDescription] = useState("");
  const [eventStartDate, setEventStartDate] = useState("");
  const [eventEndDate, setEventEndDate] = useState("");
  const [eventLevel, setEventLevel] = useState("");
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const calendarRef = useRef<FullCalendar>(null);
  const modalCalendarRef = useRef<FullCalendar>(null);
  const { isOpen, openModal, closeModal } = useModal();

  const MEAL_TYPES = {
    BREAKFAST: "Breakfast",
    LUNCH: "Lunch",
    DINNER: "Dinner"
  } as const;

  const handleDateSelect = useCallback(
    (selectInfo: DateSelectArg) => {
      const eventsOnDate = events.filter(
        (event) => event.start === selectInfo.startStr
      );

      if (eventsOnDate.length === 0) {
        resetModalFields();
        setEventStartDate(selectInfo.startStr);
        setEventEndDate(selectInfo.endStr || selectInfo.startStr);
        setIsViewMode(false);
        openModal();
      }
    },
    [events, openModal]
  );

  const handleEventClick = (clickInfo: EventClickArg) => {
    const event = clickInfo.event;
    setSelectedEvent(event as unknown as CalendarEvent);
    setEventTitle(event.title);
    setEventDescription(event.extendedProps.description || "");
    setEventStartDate(event.start?.toISOString().split("T")[0] || "");
    setEventEndDate(event.end?.toISOString().split("T")[0] || "");
    setEventLevel(event.extendedProps.calendar);
    setIsViewMode(true);
    openModal();
  };

  const handleEventDrop = (dropInfo: EventDropArg) => {
    const { event } = dropInfo;
    const newStartDate = event.start?.toISOString().split("T")[0] || "";
    const newEndDate = event.end?.toISOString().split("T")[0] || newStartDate;

    setEvents((prevEvents) =>
      prevEvents.map((ev) =>
        ev.id === event.id ? { ...ev, start: newStartDate, end: newEndDate } : ev
      )
    );
  };

  const handleAddEventButtonClick = () => {
    resetModalFields();
    setIsViewMode(false);
    openModal();
  };

  const handleAddOrUpdateEvent = () => {
    if (!eventTitle.trim()) {
      alert("Please enter a title");
      return;
    }
    if (!eventLevel) {
      alert("Please select a meal type");
      return;
    }
    if (!eventStartDate) {
      alert("Please select a start date");
      return;
    }

    const newEventData: CalendarEvent = {
      id: selectedEvent ? selectedEvent.id : Date.now().toString(),
      title: eventTitle.trim(),
      start: eventStartDate,
      end: eventEndDate || eventStartDate,
      allDay: true,
      extendedProps: {
        calendar: eventLevel as "Breakfast" | "Lunch" | "Dinner",
        description: eventDescription.trim() || undefined
      }
    };

    if (selectedEvent) {
      setEvents((prevEvents) =>
        prevEvents.map((event) =>
          String(event.id) === String(selectedEvent.id) ? newEventData : event
        )
      );
    } else {
      setEvents((prevEvents) => [...prevEvents, newEventData]);
    }
    closeModal();
    resetModalFields();
  };

  const handleDeleteEvent = () => {
    if (selectedEvent) {
      setEvents((prevEvents) =>
        prevEvents.filter(
          (event) => String(event.id) !== String(selectedEvent.id)
        )
      );
      closeModal();
      resetModalFields();
    }
  };

  const resetModalFields = () => {
    setEventTitle("");
    setEventDescription("");
    setEventStartDate("");
    setEventEndDate("");
    setEventLevel("");
    setSelectedEvent(null);
    setIsViewMode(false);
  };

  const renderModalContent = () => {
    if (isViewMode && selectedEvent) {
      return (
        <div className="space-y-6">
          <h5 className="mb-2 font-semibold text-gray-800 text-2xl dark:text-white/90">
            Event Details
          </h5>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
              Title
            </label>
            <p className="text-gray-800 dark:text-white/90">{eventTitle}</p>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
              Description
            </label>
            <p className="text-gray-800 dark:text-white/90">
              {eventDescription || "No description"}
            </p>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
              Meal Type
            </label>
            <p className="text-gray-800 dark:text-white/90">{eventLevel}</p>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
              Date Range
            </label>
            <p className="text-gray-800 dark:text-white/90">
              {eventStartDate}{" "}
              {eventEndDate && eventStartDate !== eventEndDate
                ? ` - ${eventEndDate}`
                : ""}
            </p>
          </div>
          <div className="flex items-center gap-3 mt-8">
            <button
              onClick={closeModal}
              className="flex w-full justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03]"
            >
              Close
            </button>
            <button
              onClick={handleDeleteEvent}
              className="flex w-full justify-center rounded-lg bg-red-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-600"
            >
              Delete
            </button>
            <button
              onClick={() => setIsViewMode(false)}
              className="flex w-full justify-center rounded-lg bg-blue-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-600"
            >
              Edit Event
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <h5 className="mb-2 font-semibold text-gray-800 text-2xl dark:text-white/90">
          {selectedEvent ? "Edit Event" : "Add your dishes"}
        </h5>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
            Title
          </label>
          <input
            type="text"
            value={eventTitle}
            onChange={(e) => setEventTitle(e.target.value)}
            className="h-12 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
            placeholder="Enter Dish title"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
            Description
          </label>
          <textarea
            value={eventDescription}
            onChange={(e) => setEventDescription(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
            rows={3}
            placeholder="Enter Dish description"
          />
        </div>
        <div>
          <label className="block mb-4 text-sm font-medium text-gray-700 dark:text-gray-400">
            Meals
          </label>
          <div className="flex flex-wrap items-center gap-4">
            {Object.entries(MEAL_TYPES).map(([, value]) => (
              <div key={value} className="n-chk">
                <label className="flex items-center text-sm text-gray-700 dark:text-gray-400">
                  <input
                    type="radio"
                    name="event-level"
                    value={value}
                    checked={eventLevel === value}
                    onChange={() => setEventLevel(value)}
                    className="mr-2"
                  />
                  {value}
                </label>
              </div>
            ))}
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
            Select Date Range
          </label>
          <FullCalendar
            ref={modalCalendarRef}
            plugins={[dayGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            headerToolbar={{
              left: "prev,next",
              center: "title",
              right: ""
            }}
            height="400px"
            selectable={true}
            select={(selectInfo) => {
              setEventStartDate(selectInfo.startStr);
              setEventEndDate(selectInfo.endStr || selectInfo.startStr);
            }}
            events={[
              {
                start: eventStartDate,
                end: eventEndDate,
                display: "background",
                backgroundColor: "#3b82f6"
              }
            ]}
            titleFormat={{ year: "numeric", month: "long" }}
          />
        </div>
        <div className="flex items-center gap-3 mt-8">
          <button
            onClick={closeModal}
            className="flex w-full justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03]"
          >
            Close
          </button>
          <button
            onClick={handleAddOrUpdateEvent}
            className="flex w-full justify-center rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600"
          >
            {selectedEvent ? "Update Changes" : "Add Dishes"}
          </button>
        </div>
      </div>
    );
  };

  return (
    <>
      <PageMeta
        title="React.js Calendar Dashboard | HomeStore"
        description="Calendar Dashboard for HomeStore"
      />
      <style>{calendarStyles}</style>
      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="custom-calendar">
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            headerToolbar={{
              left: "prev,next addEventButton",
              center: "title",
              right: "dayGridMonth,timeGridWeek,timeGridDay"
            }}
            events={events}
            selectable={true}
            select={handleDateSelect}
            eventClick={handleEventClick}
            eventContent={renderEventContent}
            editable={true}
            eventDrop={handleEventDrop}
            customButtons={{
              addEventButton: {
                text: "Add Meals +",
                click: handleAddEventButtonClick
              }
            }}
            titleFormat={{ year: "numeric", month: "long" }}
          />
        </div>
      </div>
      <Modal
        isOpen={isOpen}
        onClose={closeModal}
        className="max-w-[900px] p-6 lg:p-10"
      >
        <div className="flex flex-col px-4 py-6 overflow-y-auto max-h-[80vh] bg-white dark:bg-gray-900 rounded-lg shadow-lg">
          {renderModalContent()}
        </div>
      </Modal>
    </>
  );
};

const renderEventContent = (eventInfo: EventContentArg) => {
  const mealType = eventInfo.event.extendedProps.calendar as "Breakfast" | "Lunch" | "Dinner";
  const title = eventInfo.event.title || "Untitled Meal";

  const colors = {
    Breakfast: "rgb(255, 0, 0)",   // red
    Lunch: "rgb(0, 128, 0)",       // green
    Dinner: "rgb(0, 0, 255)"       // blue
  };

  return (
    <div
      className="flex items-center py-1 px-2 rounded text-black"
      style={{
        backgroundColor: "white",
        borderLeft: `4px solid ${colors[mealType] || "gray"}`,
        width: "100%",
        minWidth: "100px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        overflow: "hidden"
      }}
    >
      {/* Blue circular badge */}
      <span
        className="inline-block w-3 h-3 rounded-full bg-blue-500 mr-2"
        title="Ceramic Indicator"
      ></span>
      <div className="fc-event-title truncate font-semibold text-sm">
        {title}
      </div>
    </div>
  );
};

export default Calendar;