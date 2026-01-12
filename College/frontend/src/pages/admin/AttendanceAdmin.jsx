// import React, { useState, useEffect } from "react";
// import axios from "axios";
// import { toast, ToastContainer } from "react-toastify";
// import "react-toastify/dist/ReactToastify.css";

// const API_BASE_URL = "http://localhost:4000";

// export default function AdminAttendanceGenerator() {
//   const [fromDate, setFromDate] = useState("");
//   const [toDate, setToDate] = useState("");
//   const [timetable, setTimetable] = useState({});
//   const [students, setStudents] = useState([]);
//   const [loading, setLoading] = useState(false);
//   const [saving, setSaving] = useState(false);
//   const [error, setError] = useState(null);
//   const [selectedCourse, setSelectedCourse] = useState(null);
//   const [userProfile, setUserProfile] = useState(null);
//   const [degrees, setDegrees] = useState([]);
//   const [batches, setBatches] = useState([]);
//   const [departments, setDepartments] = useState([]);
//   const [semesters, setSemesters] = useState([]);
//   const [selectedDegree, setSelectedDegree] = useState("");
//   const [selectedBatch, setSelectedBatch] = useState("");
//   const [selectedDepartment, setSelectedDepartment] = useState("");
//   const [selectedSemester, setSelectedSemester] = useState("");

//   // Auth + Admin Check + Default Dates
//   useEffect(() => {
//     const token = localStorage.getItem("token");
//     if (!token) {
//       setError("Please log in to continue.");
//       return;
//     }
//     axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;

//     try {
//       const userData = JSON.parse(localStorage.getItem("user") || "{}");
//       setUserProfile(userData);
//       if (userData.role !== "admin") {
//         setError("Access Denied: Admins only.");
//         toast.error("Unauthorized Access");
//       }
//     } catch (err) {
//       setError("Failed to load user profile");
//     }

//     // Default date range: today to +6 days
//     if (!fromDate) {
//       const today = new Date();
//       setFromDate(today.toISOString().split("T")[0]);
//       const nextWeek = new Date(today);
//       nextWeek.setDate(today.getDate() + 6);
//       setToDate(nextWeek.toISOString().split("T")[0]);
//     }
//   }, [fromDate]);

//   // Fetch degrees & batches
//   useEffect(() => {
//     const fetchDegreesAndBatches = async () => {
//       try {
//         const res = await axios.get(
//           `${API_BASE_URL}/api/admin/timetable/batches`
//         );
//         if (res.data?.status === "success" && Array.isArray(res.data.data)) {
//           const uniqueDegrees = [
//             ...new Set(res.data.data.map((b) => b.degree)),
//           ];
//           setDegrees(uniqueDegrees);
//           setBatches(res.data.data);
//         }
//       } catch (err) {
//         setError("Failed to load degrees/batches");
//       }
//     };
//     fetchDegreesAndBatches();
//   }, []);

//   // Fetch departments
//   useEffect(() => {
//     const fetchDepartments = async () => {
//       try {
//         const res = await axios.get(
//           `${API_BASE_URL}/api/admin/timetable/departments`
//         );
//         if (res.data?.status === "success" && Array.isArray(res.data.data)) {
//           setDepartments(
//             res.data.data.map((d) => ({
//               departmentId: d.Deptid,
//               departmentCode: d.deptCode,
//               departmentName: d.Deptname,
//             }))
//           );
//         }
//       } catch (err) {
//         setError("Failed to load departments");
//       }
//     };
//     fetchDepartments();
//   }, []);

//   // Fetch semesters
//   useEffect(() => {
//     if (selectedDegree && selectedBatch && selectedDepartment) {
//       const fetchSemesters = async () => {
//         const batchData = batches.find(
//           (b) => b.batchId === parseInt(selectedBatch)
//         );
//         if (!batchData) return;

//         try {
//           const res = await axios.get(
//             `${API_BASE_URL}/api/admin/semesters/by-batch-branch`,
//             {
//               params: {
//                 degree: selectedDegree,
//                 batch: batchData.batch,
//                 branch: batchData.branch,
//               },
//             }
//           );
//           if (res.data?.status === "success") setSemesters(res.data.data);
//         } catch (err) {
//           setError("Failed to load semesters");
//         }
//       };
//       fetchSemesters();
//     } else {
//       setSemesters([]);
//     }
//   }, [selectedDegree, selectedBatch, selectedDepartment, batches]);

//   // Helper functions
//   const generateDates = () => {
//     if (!fromDate || !toDate) return [];
//     const dates = [];
//     let current = new Date(fromDate);
//     const end = new Date(toDate);
//     end.setDate(end.getDate() + 1);
//     while (current < end) {
//       dates.push(current.toISOString().split("T")[0]);
//       current.setDate(current.getDate() + 1);
//     }
//     return dates;
//   };

//   const timeSlots = [
//     { periodNumber: 1, time: "9:00–10:00" },
//     { periodNumber: 2, time: "10:00–11:00" },
//     { periodNumber: 3, time: "11:00–12:00" },
//     { periodNumber: 4, time: "12:00–1:00" },
//     { periodNumber: 5, time: "1:30–2:30" },
//     { periodNumber: 6, time: "2:30–3:30" },
//     { periodNumber: 7, time: "3:30–4:30" },
//     { periodNumber: 8, time: "4:30–5:30" },
//   ];

//   const dates = generateDates();

//   // Generate timetable
//   const handleGenerate = async () => {
//     setError(null);
//     setTimetable({});
//     setSelectedCourse(null);

//     if (
//       !selectedDegree ||
//       !selectedBatch ||
//       !selectedDepartment ||
//       !selectedSemester
//     ) {
//       toast.error("Please select all filters");
//       return;
//     }

//     setLoading(true);
//     try {
//       const batchData = batches.find(
//         (b) => b.batchId === parseInt(selectedBatch)
//       );
//       const res = await axios.get(
//         `${API_BASE_URL}/api/admin/attendance/timetable`,
//         {
//           params: {
//             startDate: fromDate,
//             endDate: toDate,
//             degree: selectedDegree,
//             batch: batchData.batch,
//             branch: batchData.branch,
//             Deptid: selectedDepartment,
//             semesterId: selectedSemester,
//           },
//         }
//       );

//       if (res.data.data?.timetable) {
//         setTimetable(res.data.data.timetable);
//         toast.success("Timetable loaded successfully!");
//       } else {
//         setError("No timetable found");
//       }
//     } catch (err) {
//       toast.error("Failed to load timetable");
//     } finally {
//       setLoading(false);
//     }
//   };

//   // Load students when course clicked
//   const handleCourseClick = async (
//     courseId,
//     sectionId,
//     date,
//     periodNumber,
//     courseTitle
//   ) => {
//     setError(null);
//     setStudents([]);
//     setSelectedCourse(null);

//     try {
//       const dayOfWeek = new Date(date)
//         .toLocaleDateString("en-US", { weekday: "short" })
//         .toUpperCase();
//       const res = await axios.get(
//         `${API_BASE_URL}/api/admin/attendance/students/${courseId}/all/${dayOfWeek}/${periodNumber}`,
//         { params: { date } }
//       );

//       if (res.data.data) {
//         const updatedStudents = res.data.data.map((s) => ({
//           ...s,
//           status: s.status === "OD" ? "OD" : "", // Only preserve existing OD
//         }));
//         setStudents(updatedStudents);
//         setSelectedCourse({
//           courseId,
//           courseTitle,
//           sectionId: "all",
//           date,
//           periodNumber,
//           dayOfWeek,
//         });
//         toast.success("Students loaded – Mark On Duty only");
//       }
//     } catch (err) {
//       toast.error("Failed to load students");
//     }
//   };

//   // Toggle OD status
//   const toggleOD = (rollnumber) => {
//     setStudents((prev) =>
//       prev.map((s) =>
//         s.rollnumber === rollnumber
//           ? { ...s, status: s.status === "OD" ? "" : "OD" }
//           : s
//       )
//     );
//   };

//   // Mark all as OD
//   const markAllOD = () => {
//     setStudents((prev) => prev.map((s) => ({ ...s, status: "OD" })));
//     toast.success("All students marked as On Duty");
//   };

//   // Save only OD students
//   const handleSave = async () => {
//     if (!selectedCourse) return;

//     const odStudents = students
//       .filter((s) => s.status === "OD")
//       .map((s) => ({
//         rollnumber: s.rollnumber,
//         name: s.name,
//         sectionName: s.sectionName || "N/A",
//         status: "OD",
//       }));

//     if (odStudents.length === 0) {
//       toast.info("No students marked as On Duty");
//       return;
//     }

//     setSaving(true);
//     try {
//       await axios.post(
//         `${API_BASE_URL}/api/admin/attendance/mark/${selectedCourse.courseId}/${selectedCourse.sectionId}/${selectedCourse.dayOfWeek}/${selectedCourse.periodNumber}`,
//         { date: selectedCourse.date, attendances: odStudents }
//       );
//       toast.success(`On Duty saved for ${odStudents.length} student(s)!`);
//     } catch (err) {
//       toast.error("Failed to save On Duty status");
//     } finally {
//       setSaving(false);
//     }
//   };

//   const odCount = students.filter((s) => s.status === "OD").length;

//   // Block non-admins
//   if (userProfile && userProfile.role !== "admin") {
//     return (
//       <div className="p-10 text-center text-3xl font-bold text-red-600">
//         Unauthorized – Admin Access Only
//       </div>
//     );
//   }

//   return (
//     <div className="p-6 max-w-7xl mx-auto bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl shadow-lg">
//       <h1 className="text-4xl font-bold mb-2 text-center text-blue-900">
//         Admin On-Duty Attendance Manager
//       </h1>
//       <p className="text-center text-blue-700 mb-8">
//         Only On Duty (OD) can be marked. Regular attendance is handled by
//         faculty.
//       </p>

//       {error && (
//         <div className="mb-6 p-4 bg-red-100 border-l-4 border-red-500 text-red-800 rounded-lg">
//           {error}
//         </div>
//       )}

//       {/* Filters - Full Original Layout */}
//       <div className="flex flex-wrap gap-4 justify-center mb-8">
//         <div className="flex flex-col">
//           <label className="text-sm text-blue-700 mb-1">Degree</label>
//           <select
//             value={selectedDegree}
//             onChange={(e) => {
//               setSelectedDegree(e.target.value);
//               setSelectedBatch("");
//               setSelectedDepartment("");
//               setSelectedSemester("");
//             }}
//             className="border-2 border-blue-300 p-3 rounded-lg"
//           >
//             <option value="">Select Degree</option>
//             {degrees.map((d) => (
//               <option key={d} value={d}>
//                 {d}
//               </option>
//             ))}
//           </select>
//         </div>

//         <div className="flex flex-col">
//           <label className="text-sm text-blue-700 mb-1">Batch</label>
//           <select
//             value={selectedBatch}
//             onChange={(e) => {
//               setSelectedBatch(e.target.value);
//               setSelectedDepartment("");
//               setSelectedSemester("");
//             }}
//             disabled={!selectedDegree}
//             className="border-2 border-blue-300 p-3 rounded-lg disabled:bg-gray-100"
//           >
//             <option value="">Select Batch</option>
//             {batches
//               .filter((b) => b.degree === selectedDegree)
//               .map((b) => (
//                 <option key={b.batchId} value={b.batchId}>
//                   {b.batch}
//                 </option>
//               ))}
//           </select>
//         </div>

//         <div className="flex flex-col">
//           <label className="text-sm text-blue-700 mb-1">Department</label>
//           <select
//             value={selectedDepartment}
//             onChange={(e) => {
//               setSelectedDepartment(e.target.value);
//               setSelectedSemester("");
//             }}
//             disabled={!selectedBatch}
//             className="border-2 border-blue-300 p-3 rounded-lg disabled:bg-gray-100"
//           >
//             <option value="">Select Department</option>
//             {departments
//               .filter((d) =>
//                 batches.some(
//                   (b) =>
//                     b.batchId === parseInt(selectedBatch) &&
//                     b.branch.toUpperCase() === d.departmentCode.toUpperCase()
//                 )
//               )
//               .map((d) => (
//                 <option key={d.departmentId} value={d.departmentId}>
//                   {d.departmentName}
//                 </option>
//               ))}
//           </select>
//         </div>

//         <div className="flex flex-col">
//           <label className="text-sm text-blue-700 mb-1">Semester</label>
//           <select
//             value={selectedSemester}
//             onChange={(e) => setSelectedSemester(e.target.value)}
//             disabled={!selectedDepartment}
//             className="border-2 border-blue-300 p-3 rounded-lg disabled:bg-gray-100"
//           >
//             <option value="">Select Semester</option>
//             {semesters.map((s) => (
//               <option key={s.semesterId} value={s.semesterId}>
//                 Semester {s.semesterNumber}
//               </option>
//             ))}
//           </select>
//         </div>

//         <div className="flex flex-col">
//           <label className="text-sm text-blue-700 mb-1">From Date</label>
//           <input
//             type="date"
//             value={fromDate}
//             onChange={(e) => setFromDate(e.target.value)}
//             className="border-2 border-blue-300 p-3 rounded-lg"
//           />
//         </div>

//         <div className="flex flex-col">
//           <label className="text-sm text-blue-700 mb-1">To Date</label>
//           <input
//             type="date"
//             value={toDate}
//             onChange={(e) => setToDate(e.target.value)}
//             min={fromDate}
//             className="border-2 border-blue-300 p-3 rounded-lg"
//           />
//         </div>

//         <div className="flex items-end">
//           <button
//             onClick={handleGenerate}
//             disabled={loading}
//             className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold disabled:opacity-50"
//           >
//             {loading ? "Loading..." : "View Timetable"}
//           </button>
//         </div>
//       </div>

//       {/* Timetable - Full Original Table */}
//       {dates.length > 0 && Object.keys(timetable).length > 0 && (
//         <div className="mb-10 overflow-x-auto rounded-lg shadow-md">
//           <table className="w-full border-collapse">
//             <thead className="bg-gradient-to-r from-blue-600 to-blue-800 text-white">
//               <tr>
//                 <th className="p-3 border border-blue-300">Date</th>
//                 <th className="p-3 border border-blue-300">Day</th>
//                 {timeSlots.map((slot) => (
//                   <th
//                     key={slot.periodNumber}
//                     className="p-3 border border-blue-300 text-center"
//                   >
//                     Period {slot.periodNumber}
//                     <br />
//                     <small>{slot.time}</small>
//                   </th>
//                 ))}
//               </tr>
//             </thead>
//             <tbody>
//               {dates.map((date) => {
//                 const dayName = new Date(date).toLocaleDateString("en-US", {
//                   weekday: "long",
//                 });
//                 const periods = (timetable[date] || []).reduce((acc, p) => {
//                   acc[p.periodNumber] = p;
//                   return acc;
//                 }, {});
//                 return (
//                   <tr key={date} className="hover:bg-blue-50">
//                     <td className="p-3 border border-blue-200 font-medium">
//                       {date}
//                     </td>
//                     <td className="p-3 border border-blue-200">{dayName}</td>
//                     {timeSlots.map((slot) => {
//                       const p = periods[slot.periodNumber];
//                       return (
//                         <td
//                           key={slot.periodNumber}
//                           className="p-3 border border-blue-200 text-center"
//                         >
//                           {p ? (
//                             <button
//                               onClick={() =>
//                                 handleCourseClick(
//                                   p.courseId,
//                                   p.sectionId,
//                                   date,
//                                   p.periodNumber,
//                                   p.courseTitle
//                                 )
//                               }
//                               className="text-blue-700 font-semibold hover:underline"
//                             >
//                               {p.courseTitle}
//                               <br />
//                               {/* <small>Sec: {p.sectionName || "All"}</small> */}
//                             </button>
//                           ) : (
//                             <span className="text-gray-400 italic">—</span>
//                           )}
//                         </td>
//                       );
//                     })}
//                   </tr>
//                 );
//               })}
//             </tbody>
//           </table>
//         </div>
//       )}

//       {/* On-Duty Marking Section */}
//       {selectedCourse && (
//         <div className="mt-10 bg-white p-8 rounded-xl shadow-xl border-2 border-blue-200">
//           <h2 className="text-2xl font-bold text-blue-900 mb-4">
//             Mark On Duty — {selectedCourse.courseTitle}
//           </h2>
//           <div className="text-sm text-blue-600 mb-6">
//             <p>
//               Date: {selectedCourse.date} | Period:{" "}
//               {selectedCourse.periodNumber}
//             </p>
//           </div>

//           {/* <div className="mb-6 p-4 bg-yellow-50 border border-yellow-300 rounded-lg">
           
//             <strong>On Duty (OD)</strong>.
//           </div> */}

//           <button
//             onClick={markAllOD}
//             className="mb-6 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-semibold"
//           >
//             Mark All as On Duty
//           </button>

//           <div className="overflow-x-auto">
//             <table className="w-full border-collapse">
//               <thead className="bg-blue-700 text-white">
//                 <tr>
//                   <th className="p-4">Roll No</th>
//                   <th className="p-4">Name</th>
//                   <th className="p-4">Section</th>
//                   <th className="p-4">On Duty?</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {students.map((s, i) => (
//                   <tr key={i} className="even:bg-blue-50 hover:bg-blue-100">
//                     <td className="p-4 text-center">{s.rollnumber}</td>
//                     <td className="p-4">{s.name}</td>
//                     <td className="p-4 text-center">
//                       {s.sectionName || "N/A"}
//                     </td>
//                     <td className="p-4 text-center">
//                       <input
//                         type="checkbox"
//                         checked={s.status === "OD"}
//                         onChange={() => toggleOD(s.rollnumber)}
//                         className="w-6 h-6 text-blue-600 rounded focus:ring-blue-500"
//                       />
//                     </td>
//                   </tr>
//                 ))}
//               </tbody>
//               <tfoot>
//                 <tr className="bg-blue-100 font-bold">
//                   <td colSpan="3" className="p-4 text-right">
//                     Total On Duty:
//                   </td>
//                   <td className="p-4 text-center text-blue-900">{odCount}</td>
//                 </tr>
//               </tfoot>
//             </table>
//           </div>

//           <div className="text-center mt-8">
//             <button
//               onClick={handleSave}
//               disabled={saving || odCount === 0}
//               className="bg-green-600 hover:bg-green-700 text-white px-10 py-4 rounded-lg text-lg font-bold disabled:opacity-50"
//             >
//               {saving ? "Saving..." : `Save On Duty (${odCount} students)`}
//             </button>
//           </div>
//         </div>
//       )}

//       <ToastContainer position="top-right" theme="light" />
//     </div>
//   );
// }

import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  GraduationCap,
  Calendar,
  Building2,
  BookOpen,
  UserCheck,
  UserX,
  Award,
} from "lucide-react";

const API_BASE_URL = "http://localhost:4000";

export default function AdminAttendanceGenerator() {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [timetable, setTimetable] = useState({});
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [degrees, setDegrees] = useState([]);
  const [batches, setBatches] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [selectedDegree, setSelectedDegree] = useState("");
  const [selectedBatch, setSelectedBatch] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [selectedSemester, setSelectedSemester] = useState("");

  // Logic for initial load and filters (Remains same as your original)
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setError("Please log in to continue.");
      return;
    }
    axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;

    try {
      const userData = JSON.parse(localStorage.getItem("user") || "{}");
      setUserProfile(userData);
      if (userData.role !== "admin") {
        setError("Access Denied: Admins only.");
        toast.error("Unauthorized Access");
      }
    } catch (err) {
      setError("Failed to load user profile");
    }

    if (!fromDate) {
      const today = new Date();
      setFromDate(today.toISOString().split("T")[0]);
      const nextWeek = new Date(today);
      nextWeek.setDate(today.getDate() + 6);
      setToDate(nextWeek.toISOString().split("T")[0]);
    }
  }, [fromDate]);

  useEffect(() => {
    const fetchDegreesAndBatches = async () => {
      try {
        const res = await axios.get(
          `${API_BASE_URL}/api/admin/timetable/batches`
        );
        if (res.data?.status === "success" && Array.isArray(res.data.data)) {
          const uniqueDegrees = [
            ...new Set(res.data.data.map((b) => b.degree)),
          ];
          setDegrees(uniqueDegrees);
          setBatches(res.data.data);
        }
      } catch (err) {
        setError("Failed to load degrees/batches");
      }
    };
    fetchDegreesAndBatches();
  }, []);

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const res = await axios.get(
          `${API_BASE_URL}/api/admin/timetable/departments`
        );
        if (res.data?.status === "success" && Array.isArray(res.data.data)) {
          setDepartments(
            res.data.data.map((d) => ({
              departmentId: d.Deptid,
              departmentCode: d.deptCode,
              departmentName: d.Deptname,
            }))
          );
        }
      } catch (err) {
        setError("Failed to load departments");
      }
    };
    fetchDepartments();
  }, []);

  useEffect(() => {
    if (selectedDegree && selectedBatch && selectedDepartment) {
      const fetchSemesters = async () => {
        const batchData = batches.find(
          (b) => b.batchId === parseInt(selectedBatch)
        );
        if (!batchData) return;
        try {
          const res = await axios.get(
            `${API_BASE_URL}/api/admin/semesters/by-batch-branch`,
            {
              params: {
                degree: selectedDegree,
                batch: batchData.batch,
                branch: batchData.branch,
              },
            }
          );
          if (res.data?.status === "success") setSemesters(res.data.data);
        } catch (err) {
          setError("Failed to load semesters");
        }
      };
      fetchSemesters();
    } else {
      setSemesters([]);
    }
  }, [selectedDegree, selectedBatch, selectedDepartment, batches]);

  const generateDates = () => {
    if (!fromDate || !toDate) return [];
    const dates = [];
    let current = new Date(fromDate);
    const end = new Date(toDate);
    end.setDate(end.getDate() + 1);
    while (current < end) {
      dates.push(current.toISOString().split("T")[0]);
      current.setDate(current.getDate() + 1);
    }
    return dates;
  };

  const timeSlots = [
    { periodNumber: 1, time: "9:00–10:00" },
    { periodNumber: 2, time: "10:00–11:00" },
    { periodNumber: 3, time: "11:00–12:00" },
    { periodNumber: 4, time: "12:00–1:00" },
    { periodNumber: 5, time: "1:30–2:30" },
    { periodNumber: 6, time: "2:30–3:30" },
    { periodNumber: 7, time: "3:30–4:30" },
    { periodNumber: 8, time: "4:30–5:30" },
  ];

  const dates = generateDates();

  const handleGenerate = async () => {
    setError(null);
    setTimetable({});
    setSelectedCourse(null);
    if (
      !selectedDegree ||
      !selectedBatch ||
      !selectedDepartment ||
      !selectedSemester
    ) {
      toast.error("Please select all filters");
      return;
    }
    setLoading(true);
    try {
      const batchData = batches.find(
        (b) => b.batchId === parseInt(selectedBatch)
      );
      const res = await axios.get(
        `${API_BASE_URL}/api/admin/attendance/timetable`,
        {
          params: {
            startDate: fromDate,
            endDate: toDate,
            degree: selectedDegree,
            batch: batchData.batch,
            branch: batchData.branch,
            Deptid: selectedDepartment,
            semesterId: selectedSemester,
          },
        }
      );
      if (res.data.data?.timetable) {
        setTimetable(res.data.data.timetable);
        toast.success("Timetable loaded!");
      } else {
        setError("No timetable found");
      }
    } catch (err) {
      toast.error("Failed to load timetable");
    } finally {
      setLoading(false);
    }
  };

  // --- UPDATED: Load students with default "P" status ---
  const handleCourseClick = async (
    courseId,
    sectionId,
    date,
    periodNumber,
    courseTitle
  ) => {
    setError(null);
    setStudents([]);
    setSelectedCourse(null);
    try {
      const dayOfWeek = new Date(date)
        .toLocaleDateString("en-US", { weekday: "short" })
        .toUpperCase();
      const res = await axios.get(
        `${API_BASE_URL}/api/admin/attendance/students/${courseId}/all/${dayOfWeek}/${periodNumber}`,
        { params: { date } }
      );
      if (res.data.data) {
        setStudents(
          res.data.data.map((s) => ({
            ...s,
            status: s.status || "P", // Default to Present if no status exists
          }))
        );
        setSelectedCourse({
          courseId,
          courseTitle,
          sectionId: "all",
          date,
          periodNumber,
          dayOfWeek,
        });
      }
    } catch (err) {
      toast.error("Failed to load students");
    }
  };

  // --- UPDATED: Status Toggle Logic ---
  const updateStatus = (rollnumber, newStatus) => {
    setStudents((prev) =>
      prev.map((s) =>
        s.rollnumber === rollnumber ? { ...s, status: newStatus } : s
      )
    );
  };

  const markAllAs = (status) => {
    setStudents((prev) => prev.map((s) => ({ ...s, status })));
  };

  const handleSave = async () => {
    if (!selectedCourse) return;
    setSaving(true);
    try {
      const attendances = students.map((s) => ({
        rollnumber: s.rollnumber,
        name: s.name,
        sectionName: s.sectionName || "N/A",
        status: s.status,
      }));

      await axios.post(
        `${API_BASE_URL}/api/admin/attendance/mark/${selectedCourse.courseId}/${selectedCourse.sectionId}/${selectedCourse.dayOfWeek}/${selectedCourse.periodNumber}`,
        { date: selectedCourse.date, attendances }
      );
      toast.success(`Attendance saved successfully!`);
    } catch (err) {
      toast.error("Failed to save attendance");
    } finally {
      setSaving(false);
    }
  };

  const stats = {
    P: students.filter((s) => s.status === "P").length,
    A: students.filter((s) => s.status === "A").length,
    OD: students.filter((s) => s.status === "OD").length,
  };

  if (userProfile && userProfile.role !== "admin") {
    return (
      <div className="p-10 text-center text-2xl font-bold">Unauthorized</div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-4 md:p-8 font-sans text-slate-900">
      <div className="text-center mb-12">
        <div className="flex justify-center mb-4">
          <div className="p-3 rounded-full border-2 border-slate-900">
            <GraduationCap size={40} className="text-slate-900" />
          </div>
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight mb-2 uppercase italic">
          Admin Attendance
        </h1>
      </div>

      {/* Filter Section (Same as original) */}
      <div className="max-w-7xl mx-auto border-y border-slate-200 py-10 mb-10">
        <div className="flex flex-wrap items-end justify-center gap-6">
          {/* ... Existing Degree, Batch, Dept, Semester Selects ... */}
          {/* (Kept your original filter structure here) */}
          <div className="flex flex-col min-w-[150px]">
            <label className="text-xs font-bold mb-2 uppercase">Degree</label>
            <select
              value={selectedDegree}
              onChange={(e) => setSelectedDegree(e.target.value)}
              className="border border-slate-300 p-2 rounded"
            >
              <option value="">Select</option>
              {degrees.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col min-w-[150px]">
            <label className="text-xs font-bold mb-2 uppercase">Batch</label>
            <select
              value={selectedBatch}
              onChange={(e) => setSelectedBatch(e.target.value)}
              className="border border-slate-300 p-2 rounded"
            >
              <option value="">Select</option>
              {batches
                .filter((b) => b.degree === selectedDegree)
                .map((b) => (
                  <option key={b.batchId} value={b.batchId}>
                    {b.batch}
                  </option>
                ))}
            </select>
          </div>
          <div className="flex flex-col min-w-[150px]">
            <label className="text-xs font-bold mb-2 uppercase">Dept</label>
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="border border-slate-300 p-2 rounded"
            >
              <option value="">Select</option>
              {departments.map((d) => (
                <option key={d.departmentId} value={d.departmentId}>
                  {d.departmentName}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col min-w-[150px]">
            <label className="text-xs font-bold mb-2 uppercase">Sem</label>
            <select
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(e.target.value)}
              className="border border-slate-300 p-2 rounded"
            >
              <option value="">Select</option>
              {semesters.map((s) => (
                <option key={s.semesterId} value={s.semesterId}>
                  {s.semesterNumber}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="border border-slate-300 p-2 rounded text-sm"
            />
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="border border-slate-300 p-2 rounded text-sm"
            />
          </div>
          <button
            onClick={handleGenerate}
            className="bg-black text-white px-6 py-2 rounded font-bold uppercase text-sm"
          >
            Get Timetable
          </button>
        </div>
      </div>

      {/* Timetable View */}
      {dates.length > 0 && Object.keys(timetable).length > 0 && (
        <div className="max-w-7xl mx-auto overflow-hidden rounded-xl border border-slate-200 shadow-sm mb-12">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="p-4 font-bold text-slate-400 uppercase text-xs">
                    Date
                  </th>
                  {timeSlots.map((slot) => (
                    <th
                      key={slot.periodNumber}
                      className="p-4 font-bold text-slate-400 uppercase text-xs text-center border-l border-slate-100"
                    >
                      P{slot.periodNumber}
                      <br />
                      <span className="font-normal">{slot.time}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dates.map((date) => (
                  <tr
                    key={date}
                    className="hover:bg-slate-50 transition-colors border-b border-slate-100"
                  >
                    <td className="p-4 font-bold">{date}</td>
                    {timeSlots.map((slot) => {
                      const p = (timetable[date] || []).find(
                        (tp) => tp.periodNumber === slot.periodNumber
                      );
                      return (
                        <td
                          key={slot.periodNumber}
                          className="p-2 border-l border-slate-100 text-center"
                        >
                          {p ? (
                            <button
                              onClick={() =>
                                handleCourseClick(
                                  p.courseId,
                                  p.sectionId,
                                  date,
                                  p.periodNumber,
                                  p.courseTitle
                                )
                              }
                              className="w-full py-2 text-[10px] font-bold border border-slate-200 rounded hover:border-black"
                            >
                              {p.courseTitle}
                            </button>
                          ) : (
                            <span className="text-slate-200">-</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Attendance Marking Section */}
      {selectedCourse && (
        <div className="max-w-5xl mx-auto bg-white p-8 border-2 border-black rounded-sm shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4 border-b-2 border-slate-100 pb-6">
            <div>
              <h2 className="text-2xl font-black uppercase tracking-tighter">
                {selectedCourse.courseTitle}
              </h2>
              <p className="text-slate-500 font-mono text-sm">
                {selectedCourse.date} | Period {selectedCourse.periodNumber}
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => markAllAs("P")}
                className="flex items-center gap-1 text-[10px] font-bold border-2 border-black px-3 py-1 hover:bg-green-50 uppercase"
              >
                <UserCheck size={14} /> All Present
              </button>
              <button
                onClick={() => markAllAs("A")}
                className="flex items-center gap-1 text-[10px] font-bold border-2 border-black px-3 py-1 hover:bg-red-50 uppercase"
              >
                <UserX size={14} /> All Absent
              </button>
              <button
                onClick={() => markAllAs("OD")}
                className="flex items-center gap-1 text-[10px] font-bold border-2 border-black px-3 py-1 hover:bg-blue-50 uppercase"
              >
                <Award size={14} /> All OD
              </button>
            </div>
          </div>

          <div className="max-h-[500px] overflow-y-auto mb-8 border border-black">
            <table className="w-full text-left">
              <thead className="sticky top-0 bg-black text-white text-xs uppercase">
                <tr>
                  <th className="p-3">Roll No</th>
                  <th className="p-3">Student Name</th>
                  <th className="p-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {students.map((s) => (
                  <tr
                    key={s.rollnumber}
                    className={
                      s.status === "A"
                        ? "bg-red-50"
                        : s.status === "OD"
                        ? "bg-blue-50"
                        : ""
                    }
                  >
                    <td className="p-4 font-mono text-sm">{s.rollnumber}</td>
                    <td className="p-4 font-bold">{s.name}</td>
                    <td className="p-4">
                      <div className="flex justify-center gap-2">
                        {["P", "A", "OD"].map((status) => (
                          <button
                            key={status}
                            onClick={() => updateStatus(s.rollnumber, status)}
                            className={`w-10 h-8 font-bold border-2 transition-all ${
                              s.status === status
                                ? "bg-black text-white border-black"
                                : "bg-white text-slate-400 border-slate-200 hover:border-black"
                            }`}
                          >
                            {status}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t-2 border-black pt-6">
            <div className="flex gap-4 text-xs font-black uppercase">
              <span className="text-green-600">Present: {stats.P}</span>
              <span className="text-red-600">Absent: {stats.A}</span>
              <span className="text-blue-600">On-Duty: {stats.OD}</span>
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-black text-white px-10 py-4 font-black uppercase tracking-widest hover:bg-slate-800 disabled:opacity-20 active:translate-y-1 transition-all"
            >
              {saving ? "Saving..." : "Save Attendance"}
            </button>
          </div>
        </div>
      )}
      <ToastContainer position="bottom-right" theme="dark" />
    </div>
  );
}