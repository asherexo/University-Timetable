const API_BASE_URL = "http://localhost:5500"; 

// function for loggin in
function login() {
    $.ajax({
        url: API_BASE_URL + "/auth/login",
        type: "POST",
        contentType: "application/json",
        data: JSON.stringify({
            email: $("#email").val(),
            password: $("#password").val()
        }),
        success: function(response) {
            localStorage.setItem("token", response.token);
            localStorage.setItem("role", response.role);
        
            
            if (response.role === "student") {
                localStorage.setItem("course_ids", JSON.stringify(response.course_ids));
            }
        
            alert("Login successful!");
            if (response.role === "admin") {
                window.location.href = "admin.html";
            } else {
                window.location.href = "index.html";
            }
        },
        error: function(err) {
            alert("Login failed: " + err.responseJSON.error);
        }
    });
}

// function for registerr
function register() {
    $.ajax({
        url: API_BASE_URL + "/auth/register",
        type: "POST",
        contentType: "application/json",
        data: JSON.stringify({
            name: $("#name").val(),
            email: $("#reg_email").val(),
            password: $("#reg_password").val(),
            role: "student"
        }),
        success: function(response) {
            alert("Registration successful! Please login.");
        },
        error: function(err) {
            alert("Registration failed: " + err.responseJSON.error);
        }
    });
}

// to fetch student's timetable
function fetchTimetable() {
    let token = localStorage.getItem("token");
    console.log("Fetching Student Timetable...");
    console.log("Token being sent:", token);

    $.ajax({
        url: "http://localhost:5500/timetable",
        type: "GET",
        headers: { "Authorization": "Bearer " + token },
        success: function(response) {
            console.log("Timetable Data:", response); 

            let weeklyTimetable = {}; 
            let daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
            let listTimetableHTML = ""; 

            
            response.forEach(entry => {
                let { subject_name, room_name, day, time_slot, course_name } = entry;

                
                if (!weeklyTimetable[time_slot]) {
                    weeklyTimetable[time_slot] = { Monday: "-", Tuesday: "-", Wednesday: "-", Thursday: "-", Friday: "-" };
                }
                weeklyTimetable[time_slot][day] = `${subject_name} (${course_name}) - ${room_name}`;

                
                listTimetableHTML += `
                <tr>
                    <td>${day}</td>
                    <td>${time_slot}</td>
                    <td>${course_name}</td>
                    <td>${subject_name}</td>
                    <td>${room_name}</td>
                </tr>`;
            });

            
            let sortedTimeSlots = Object.keys(weeklyTimetable).sort((a, b) => {
                let [startA] = a.split(" - ");
                let [startB] = b.split(" - ");

                let [hourA, minA] = startA.split(":").map(Number);
                let [hourB, minB] = startB.split(":").map(Number);

                return hourA === hourB ? minA - minB : hourA - hourB;
            });

            
            let weeklyHTML = sortedTimeSlots.map(time_slot => {
                let row = `<tr><td>${time_slot}</td>`;
                daysOfWeek.forEach(day => {
                    row += `<td>${weeklyTimetable[time_slot][day]}</td>`;
                });
                row += "</tr>";
                return row;
            }).join("");

           
            $("#weeklyTimetableBody").html(weeklyHTML);
            $("#listTimetableBody").html(listTimetableHTML);
        },
        error: function(err) {
            console.error("Error fetching timetable:", err);
            alert("Failed to load timetable: " + (err.responseJSON ? err.responseJSON.error : "Unknown error"));
        }
    });
}


$(document).ready(fetchTimetable);

function downloadTimetable() {
    let timetableHTML = document.getElementById("timetable").outerHTML;
    let blob = new Blob([timetableHTML], { type: "text/html" });
    let a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "timetable.html";
    a.click();
}


function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    alert("Logged out successfully!");
    window.location.href = "login.html";
}


$(document).ready(function() {
    if (window.location.pathname.includes("index.html")) {
        fetchTimetable();
    }
});


function fetchAdminTimetable() {
    let token = localStorage.getItem("token");

    console.log("Fetching Admin Timetable...");
    console.log("Token being sent:", token);

    $.ajax({
        url: "http://localhost:5500/timetable",
        type: "GET",
        headers: { "Authorization": "Bearer " + token },
        success: function(response) {
            console.log("Timetable Data:", response); 

            let groupedTimetable = {};

            
            response.forEach(entry => {
                if (!groupedTimetable[entry.course_name]) {
                    groupedTimetable[entry.course_name] = [];
                }
                groupedTimetable[entry.course_name].push(entry);
            });

            let timetableHTML = "";
            
            Object.keys(groupedTimetable).forEach(course_name => {
                timetableHTML += `
                <tr>
                    <td rowspan="${groupedTimetable[course_name].length + 1}" style="font-weight: bold;">${course_name}</td>
                </tr>`;

                groupedTimetable[course_name].forEach(entry => {
                    timetableHTML += `
                    <tr>
                        <td>${entry.subject_name}</td>
                        <td>${entry.room_name}</td>
                        <td>${entry.day}</td>
                        <td>${entry.time_slot}</td>
                        <td><button onclick="deleteTimetable(${entry.id})">Delete</button></td>
                    </tr>`;
                });
            });

            $("#timetable-data").html(timetableHTML);
        },
        error: function(err) {
            console.error("Error fetching timetable:", err);
            alert("Failed to load timetable: " + (err.responseJSON ? err.responseJSON.error : "Unknown error"));
        }
    });
}


$(document).ready(function() {
    if (window.location.pathname.includes("index.html")) {
        fetchTimetable();
    }
});


function addTimetable() {
    let course_id = $("#timetableCourseSelect").val();
    let subject_id = $("#subjectSelect").val();
    let classroom_id = $("#classroomSelect").val();
    let day = $("#daySelect").val();
    let time_slot = $("#timeSlot").val();

    if (!course_id || !subject_id || !classroom_id || !day || !time_slot) {
        alert("All fields are required!");
        return;
    }

    $.ajax({
        url: "http://localhost:5500/timetable",
        type: "POST",
        headers: {
            "Authorization": "Bearer " + localStorage.getItem("token"),
        },
        contentType: "application/json",
        data: JSON.stringify({
            course_id: course_id,
            subject_id: subject_id,
            classroom_id: classroom_id,
            day: day,
            time_slot: time_slot,
        }),
        success: function (response) {
            alert("Timetable entry added successfully!");
            fetchAdminTimetable();
        },
        error: function (err) {
            alert("Failed to add timetable: " + err.responseJSON.error);
        }
    });
}


function deleteTimetable(id) {
    $.ajax({
        url: `http://localhost:5500/timetable/${id}`,
        type: "DELETE",
        headers: {
            "Authorization": "Bearer " + localStorage.getItem("token")
        },
        success: function(response) {
            alert("Timetable entry deleted successfully!");
            fetchAdminTimetable();
        },
        error: function(err) {
            alert("Failed to delete timetable: " + err.responseJSON.error);
        }
    });
}


function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    alert("Logged out successfully!");
    window.location.href = "login.html";
}

$(document).ready(function() {
    if (window.location.pathname.includes("admin_timetable.html")) {
        let role = localStorage.getItem("role");
        if (role !== "admin") {
            alert("Access Denied: Admins only.");
            window.location.href = "login.html";
        } else {
            fetchAdminTimetable();
        }
    }
});

function fetchStudents() {
    $.ajax({
        url: "http://localhost:5500/admin/students",
        type: "GET",
        headers: { "Authorization": "Bearer " + localStorage.getItem("token") },
        success: function(response) {
            $("#students-data").empty(); 
            $("#studentSelect").empty(); 

            let studentIds = new Set(); 

            let studentRows = response.map(student => {
                if (studentIds.has(student.id)) return ''; 
                studentIds.add(student.id);

                return `
                    <tr id="student-${student.id}">
                        <td>${student.id}</td>
                        <td>${student.name}</td>
                        <td>${student.email}</td>
                        <td id="courses-${student.id}">Loading...</td> 
                        <td><button onclick="deleteStudent(${student.id})">Delete</button></td>
                    </tr>
                `;
            }).join("");

            $("#students-data").html(studentRows);

            let studentOptions = response.filter((student, index, self) =>
                index === self.findIndex((s) => s.id === student.id)
            ).map(student => `
                <option value="${student.id}">${student.name} (ID: ${student.id})</option>
            `).join("");

            $("#studentSelect").html(studentOptions);

            studentIds.forEach(studentId => fetchAssignedCourses(studentId));
        },
        error: function(err) {
            console.error("Error fetching students:", err);
        }
    });
}



function deleteStudent(student_id) {
    if (!confirm("Are you sure you want to delete this student?")) return;

    $.ajax({
        url: `http://localhost:5500/admin/students/${student_id}`,
        type: "DELETE",
        headers: { "Authorization": "Bearer " + localStorage.getItem("token") },
        success: function(response) {
            alert("Student deleted successfully!");
            fetchStudents(); 
        },
        error: function(err) {
            console.error("Error deleting student:", err);
            alert("Failed to delete student.");
        }
    });
}

function addCourse() {
    let code = $("#courseCode").val().trim();
    let name = $("#courseName").val().trim();
    
    if (!code || !name) {
        alert("Please enter both course code and name.");
        return;
    }

    let token = localStorage.getItem("token");

    $.ajax({
        url: "http://localhost:5500/courses",
        type: "POST",
        headers: {
            "Authorization": "Bearer " + token,
            "Content-Type": "application/json"
        },
        data: JSON.stringify({ code, name }),
        success: function (response) {
            alert("Course added successfully!");
            fetchCourses(); 
        },
        error: function (err) {
            console.error("Error adding course:", err);
            alert("Failed to add course.");
        }
    });
}


function fetchCourses() {
    $.ajax({
        url: "http://localhost:5500/courses",
        type: "GET",
        headers: {
            "Authorization": "Bearer " + localStorage.getItem("token"),
        },
        success: function (response) {
            let courseOptions = response.map(course =>
                `<option value="${course.id}">${course.name}</option>`
            ).join("");

           
           $("#courseSelect").html(courseOptions);  
           $("#timetableCourseSelect").html(courseOptions);
           $("#subjectCourseSelect").html(courseOptions);
        },
        error: function (err) {
            console.error("Error fetching courses:", err);
        }
    });
}


function assignCourses() {
    let student_id = $("#studentSelect").val();
    let course_id = $("#courseSelect").val();

    if (!student_id || !course_id) {
        alert("Please select both a student and a course.");
        return;
    }

    $.ajax({
        url: "http://localhost:5500/admin/assign-course",
        type: "POST",
        contentType: "application/json",
        headers: { "Authorization": "Bearer " + localStorage.getItem("token") },
        data: JSON.stringify({ student_id, course_id }),
        success: function(response) {
            alert("Course assigned successfully!");
            fetchStudents();
        },
        error: function(err) {
            console.error("Error assigning course:", err);
            alert("Failed to assign course.");
        }
    });
}


function fetchAssignedCourses(studentId) {
    $.ajax({
        url: `http://localhost:5500/admin/student-courses?student_id=${studentId}`,
        type: "GET",
        headers: { "Authorization": "Bearer " + localStorage.getItem("token") },
        success: function(response) {
            if (response.length > 0) {
                let uniqueCourses = [...new Set(response.map(course => course.name))];
                $(`#courses-${studentId}`).text(uniqueCourses.join(", "));
            } else {
                $(`#courses-${studentId}`).text("No Courses Assigned");
            }
        },
        error: function(err) {
            console.error("Error fetching assigned courses:", err);
        }
    });
}

function fetchSubjects() {
    let course_id = $("#timetableCourseSelect").val();
    if (!course_id) return;

    $.ajax({
        url: `http://localhost:5500/subjects?course_id=${course_id}`,
        type: "GET",
        headers: {
            "Authorization": "Bearer " + localStorage.getItem("token"),
        },
        success: function (response) {
            let subjectOptions = response.map(subject =>
                `<option value="${subject.id}">${subject.code} - ${subject.name}</option>` 
            ).join("");

            $("#subjectSelect").html(subjectOptions);
        },
        error: function (err) {
            console.error("Error fetching subjects:", err);
        }
    });
}

function addSubject() {
    let name = $("#newSubjectName").val().trim();
    let code = $("#newSubjectCode").val().trim();
    let course_id = $("#subjectCourseSelect").val();

    if (!name || !code || !course_id) {
        alert("Please fill all fields.");
        return;
    }

    $.ajax({
        url: "http://localhost:5500/subjects",
        type: "POST",
        headers: {
            "Authorization": "Bearer " + localStorage.getItem("token"),
            "Content-Type": "application/json"
        },
        data: JSON.stringify({ name, code, course_id }),
        success: function (response) {
            alert("Subject added successfully!");
            $("#newSubjectName").val("");
            $("#newSubjectCode").val("");
            fetchSubjects();
        },
        error: function (err) {
            alert("Error adding subject: " + err.responseJSON.error);
        }
    });
}

function fetchCoursesWithSubjects() {
    $.ajax({
        url: "http://localhost:5500/admin/courses-with-subjects",
        type: "GET",
        headers: { "Authorization": "Bearer " + localStorage.getItem("token") },
        success: function (response) {
            let tableContent = "";
            
            response.forEach(course => {
                let courseRowSpan = course.subjects.length || 1;
                
                
                tableContent += `
                    <tr>
                        <td rowspan="${courseRowSpan}">${course.course_code}</td>
                        <td rowspan="${courseRowSpan}">${course.course_name}</td>
                `;

                if (course.subjects.length > 0) {
                    
                    tableContent += `
                        <td>${course.subjects[0].subject_code}</td>
                        <td>${course.subjects[0].subject_name}</td>
                        <td>
                            <button onclick="deleteSubject(${course.subjects[0].subject_id})">Remove Subject</button>
                        </td>
                    </tr>
                    `;

                    for (let i = 1; i < course.subjects.length; i++) {
                        tableContent += `
                            <tr>
                                <td>${course.subjects[i].subject_code}</td>
                                <td>${course.subjects[i].subject_name}</td>
                                <td>
                                    <button onclick="deleteSubject(${course.subjects[i].subject_id})">Remove Subject</button>
                                </td>
                            </tr>
                        `;
                    }
                } else {
                   
                    tableContent += `
                        <td colspan="2">No Subjects Assigned</td>
                        <td>
                            <button onclick="deleteCourse(${course.course_id})">Delete Course</button>
                        </td>
                    </tr>
                    `;
                }
            });

            $("#coursesTable tbody").html(tableContent);
        },
        error: function (err) {
            console.error("Error fetching courses and subjects:", err);
        }
    });
}

function deleteSubject(subjectId) {
    if (!confirm("Are you sure you want to delete this subject?")) return;

    $.ajax({
        url: `http://localhost:5500/admin/subjects/${subjectId}`,
        type: "DELETE",
        headers: { "Authorization": "Bearer " + localStorage.getItem("token") },
        success: function () {
            alert("Subject deleted successfully!");
            fetchCoursesWithSubjects();
        },
        error: function (err) {
            console.error("Error deleting subject:", err);
        }
    });
}

function deleteCourse(courseId) {
    if (!confirm("Are you sure you want to delete this course and all its subjects?")) return;

    $.ajax({
        url: `http://localhost:5500/admin/courses/${courseId}`,
        type: "DELETE",
        headers: { "Authorization": "Bearer " + localStorage.getItem("token") },
        success: function () {
            alert("Course and its subjects deleted successfully!");
            fetchCoursesWithSubjects(); 
        },
        error: function (err) {
            console.error("Error deleting course:", err);
        }
    });
}

function fetchAvailableClassrooms() {
    let day = $("#daySelect").val();
    let time_slot = $("#timeSlot").val();

    console.log("Fetching available classrooms for:", { day, time_slot }); 

    if (!day || !time_slot) {
        console.error("Day and time slot are missing!");
        return;
    }

    $.ajax({
        url: `http://localhost:5500/classrooms/available-classrooms?day=${day}&time_slot=${time_slot}`,
        type: "GET",
        headers: { "Authorization": "Bearer " + localStorage.getItem("token") },
        success: function (response) {
            let options = response.map(room => `<option value="${room.id}">${room.room_name} (Capacity: ${room.capacity})</option>`).join("");
            $("#classroomSelect").html(options);
        },
        error: function (err) {
            console.error("Error fetching available classrooms:", err);
        }
    });
}

$("#daySelect, #timeSlotInput").on("change", fetchAvailableClassrooms);



$(document).ready(function() {
    let role = localStorage.getItem("role");

    if (window.location.pathname.includes("admin_courses.html") || window.location.pathname.includes("admin_timetable.html") || window.location.pathname.includes("admin_students.html")) {
        if (role !== "admin") {
            alert("Access Denied: Admins only.");
            window.location.href = "login.html";
        } else {
            fetchAdminTimetable();
            fetchStudents();
            fetchCourses();
            fetchSubjects();
            fetchCoursesWithSubjects()

        }
    }
});
