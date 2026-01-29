import express from "express";
import pool from "../db.js";
import catchAsync from "../utils/catchAsync.js";

const router = express.Router();

export const getElectiveBuckets = catchAsync(async (req, res) => {
  const { semesterId } = req.params;
  const connection = await pool.getConnection();
  try {
    const [buckets] = await connection.execute(
      `SELECT bucketId, bucketNumber, bucketName 
       FROM ElectiveBucket 
       WHERE semesterId = ?`,
      [semesterId]
    );
    for (let bucket of buckets) {
      const [courses] = await connection.execute(
      `SELECT 
        c.courseCode, 
        c.courseTitle, 
        vc.verticalId, 
        v.verticalName
      FROM ElectiveBucketCourse ebc 
      JOIN Course c ON ebc.courseId = c.courseId 
      JOIN Semester s ON c.semesterId = s.semesterId
      JOIN Batch b ON s.batchId = b.batchId
      LEFT JOIN RegulationCourse rc 
        ON rc.courseCode = c.courseCode 
        AND rc.semesterNumber = s.semesterNumber 
        AND rc.regulationId = b.regulationId
      LEFT JOIN VerticalCourse vc ON rc.regCourseId = vc.regCourseId
      LEFT JOIN Vertical v ON vc.verticalId = v.verticalId
      WHERE ebc.bucketId = ? AND c.isActive = 'YES'`,
      [bucket.bucketId]
    );
      bucket.courses = courses;
    }
    res.status(200).json({ status: "success", data: buckets });
  } finally {
    connection.release();
  }
});

export const createElectiveBucket = catchAsync(async (req, res) => {
  const { semesterId } = req.params;
  const connection = await pool.getConnection();
  try {
    // 1. Verify semester exists (Optional but safer)
    const [semExists] = await connection.execute(
      "SELECT semesterId FROM Semester WHERE semesterId = ?",
      [semesterId]
    );
    if (semExists.length === 0) {
      return res
        .status(404)
        .json({ status: "error", message: "Semester not found" });
    }

    // 2. Auto-increment bucket number for THIS semester
    const [maxRow] = await connection.execute(
      `SELECT COALESCE(MAX(bucketNumber), 0) as maxNum FROM ElectiveBucket WHERE semesterId = ?`,
      [semesterId]
    );
    const bucketNumber = maxRow[0].maxNum + 1;

    const [result] = await connection.execute(
      `INSERT INTO ElectiveBucket (semesterId, bucketNumber, bucketName, createdBy) 
       VALUES (?, ?, ?, ?)`,
      [
        semesterId,
        bucketNumber,
        `Elective Bucket ${bucketNumber}`,
        req.user.Userid,
      ]
    );

    res.status(201).json({
      status: "success",
      bucketId: result.insertId,
      bucketNumber,
    });
  } finally {
    connection.release();
  }
});

export const updateElectiveBucketName = catchAsync(async (req, res) => {
  const { bucketId } = req.params;
  const { bucketName } = req.body;
  if (!bucketName || !bucketName.trim()) {
    return res
      .status(400)
      .json({ status: "failure", message: "Bucket name cannot be empty" });
  }
  const connection = await pool.getConnection();
  try {
    const [bucket] = await connection.execute(
      `SELECT bucketId FROM ElectiveBucket WHERE bucketId = ?`,
      [bucketId]
    );
    if (bucket.length === 0) {
      return res
        .status(404)
        .json({
          status: "failure",
          message: `Bucket with ID ${bucketId} not found`,
        });
    }
    const [result] = await connection.execute(
      `UPDATE ElectiveBucket SET bucketName = ?, updatedAt = CURRENT_TIMESTAMP WHERE bucketId = ?`,
      [bucketName.trim(), bucketId]
    );
    if (result.affectedRows === 0) {
      return res
        .status(500)
        .json({
          status: "failure",
          message: `Failed to update bucket ${bucketId}`,
        });
    }
    res
      .status(200)
      .json({
        status: "success",
        message: `Bucket ${bucketId} name updated successfully`,
      });
  } catch (err) {
    console.error("Error updating bucket name:", err);
    res.status(500).json({
      status: "failure",
      message: `Server error: ${err.message}`,
      sqlMessage: err.sqlMessage || "No SQL message available",
    });
  } finally {
    connection.release();
  }
});

export const addCoursesToBucket = catchAsync(async (req, res) => {
  const { bucketId } = req.params;
  const { courseCodes } = req.body;

  if (!Array.isArray(courseCodes) || courseCodes.length === 0) {
    return res.status(400).json({
      status: "failure",
      message: "courseCodes must be a non-empty array",
    });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Get bucket's semesterId
    const [bucket] = await connection.execute(
      `SELECT semesterId FROM ElectiveBucket WHERE bucketId = ?`,
      [bucketId]
    );

    if (bucket.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        status: "failure",
        message: `Bucket with ID ${bucketId} not found`,
      });
    }

    const bucketSemesterId = bucket[0].semesterId;

    const errors = [];
    const addedCourses = [];

    for (let courseCode of courseCodes) {
      // 1. Try to find existing course in this semester
      let [course] = await connection.execute(
        `SELECT courseId FROM Course 
         WHERE courseCode = ? AND semesterId = ?`,
        [courseCode, bucketSemesterId]
      );

      let courseId;

      if (course.length === 0) {
        // 2. If not found → check if it exists in RegulationCourse (global PEC/OEC)
        const [regCourse] = await connection.execute(
          `SELECT rc.*, b.regulationId
           FROM RegulationCourse rc
           JOIN Batch b ON rc.regulationId = b.regulationId
           JOIN Semester s ON s.batchId = b.batchId
           WHERE rc.courseCode = ? 
           AND s.semesterId = ?
           AND rc.category IN ('PEC', 'OEC')`,
          [courseCode, bucketSemesterId]
        );

        if (regCourse.length === 0) {
          errors.push(`Course ${courseCode} not found in regulation or not available for this semester`);
          continue;
        }

        // 3. Auto-create Course entry for this semester
        const reg = regCourse[0];
        const [insert] = await connection.execute(
          `INSERT INTO Course (
            courseCode, semesterId, courseTitle, category, type,
            lectureHours, tutorialHours, practicalHours, experientialHours,
            totalContactPeriods, credits, minMark, maxMark, createdBy, updatedBy
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            reg.courseCode,
            bucketSemesterId,
            reg.courseTitle,
            reg.category,
            reg.type,
            reg.lectureHours,
            reg.tutorialHours,
            reg.practicalHours,
            reg.experientialHours,
            reg.totalContactPeriods,
            reg.credits,
            reg.minMark,
            reg.maxMark,
            'system-auto',
            'system-auto'
          ]
        );

        courseId = insert.insertId;
        console.log(`Auto-created Course entry for global ${reg.category} ${courseCode} in semesterId ${bucketSemesterId}`);
      } else {
        courseId = course[0].courseId;
      }

      // 4. Check if already in this bucket
      const [existing] = await connection.execute(
        `SELECT id FROM ElectiveBucketCourse 
         WHERE bucketId = ? AND courseId = ?`,
        [bucketId, courseId]
      );

      if (existing.length > 0) {
        continue; // Already in bucket
      }

      // 5. Add to bucket
      await connection.execute(
        `INSERT INTO ElectiveBucketCourse (bucketId, courseId) VALUES (?, ?)`,
        [bucketId, courseId]
      );

      addedCourses.push(courseCode);
    }

    if (addedCourses.length === 0 && errors.length > 0) {
      await connection.rollback();
      return res.status(400).json({
        status: "failure",
        message: "Failed to add courses to bucket",
        errors,
      });
    }

    await connection.commit();

    res.status(200).json({
      status: "success",
      message: `Successfully processed courses for bucket`,
      addedCount: addedCourses.length,
      addedCourses,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    if (connection) await connection.rollback();
    console.error("Error adding courses to bucket:", err);
    res.status(500).json({
      status: "failure",
      message: `Server error: ${err.message}`,
    });
  } finally {
    if (connection) connection.release();
  }
});

export const removeCourseFromBucket = catchAsync(async (req, res) => {
  const { bucketId, courseCode } = req.params;
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Get bucket's semesterId
    const [bucket] = await connection.execute(
      `SELECT semesterId FROM ElectiveBucket WHERE bucketId = ?`,
      [bucketId]
    );
    if (bucket.length === 0) {
      return res.status(404).json({ status: "failure", message: `Bucket ${bucketId} not found` });
    }
    const semesterId = bucket[0].semesterId;

    // 2. Get courseId from courseCode in this semester
    const [courses] = await connection.execute(
      `SELECT courseId FROM Course WHERE courseCode = ? AND semesterId = ?`,
      [courseCode, semesterId]
    );
    if (courses.length === 0) {
      return res.status(404).json({ status: "failure", message: `Course ${courseCode} not found in this semester` });
    }
    const courseId = courses[0].courseId;

    // 3. Remove from this bucket
    const [deleteResult] = await connection.execute(
      `DELETE FROM ElectiveBucketCourse WHERE bucketId = ? AND courseId = ?`,
      [bucketId, courseId]
    );
    if (deleteResult.affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json({ status: "failure", message: `Course not found in bucket ${bucketId}` });
    }

    // 4. NEW: Check if this course is still used in ANY other bucket for this semester
    const [otherBuckets] = await connection.execute(
      `SELECT COUNT(*) as count 
       FROM ElectiveBucketCourse ebc
       JOIN ElectiveBucket eb ON ebc.bucketId = eb.bucketId
       WHERE ebc.courseId = ? AND eb.semesterId = ? AND eb.bucketId != ?`,
      [courseId, semesterId, bucketId]
    );

    const stillUsed = otherBuckets[0].count > 0;

    // 5. If not used anywhere else in this semester → delete the Course entry
    if (!stillUsed) {
      // Optional: Check if this was auto-created (e.g., original semesterNumber was NULL)
      const [regCourse] = await connection.execute(
        `SELECT semesterNumber FROM RegulationCourse WHERE courseCode = ?`,
        [courseCode]
      );
      const isGlobal = regCourse.length > 0 && regCourse[0].semesterNumber === null;

      if (isGlobal) {
        await connection.execute(
          `DELETE FROM Course WHERE courseId = ?`,
          [courseId]
        );
        console.log(`Deleted auto-created Course entry for global ${courseCode} in semester ${semesterId}`);
      }
    }

    await connection.commit();

    res.status(200).json({
      status: "success",
      message: `Course ${courseCode} removed from bucket ${bucketId}`,
      deletedCourseEntry: !stillUsed && isGlobal ? true : false
    });
  } catch (err) {
    if (connection) await connection.rollback();
    console.error("Error removing course from bucket:", err);
    res.status(500).json({
      status: "failure",
      message: `Server error: ${err.message}`,
    });
  } finally {
    if (connection) connection.release();
  }
});

export const deleteElectiveBucket = catchAsync(async (req, res) => {
  const { bucketId } = req.params;
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    // Delete associated courses first
    await connection.execute(
      `DELETE FROM ElectiveBucketCourse WHERE bucketId = ?`,
      [bucketId]
    );
    // Delete the bucket
    const [result] = await connection.execute(
      `DELETE FROM ElectiveBucket WHERE bucketId = ?`,
      [bucketId]
    );
    if (result.affectedRows === 0) {
      throw new Error(`Bucket with ID ${bucketId} not found`);
    }
    await connection.commit();
    res
      .status(200)
      .json({ status: "success", message: "Bucket deleted successfully" });
  } catch (err) {
    await connection.rollback();
    console.error("Error deleting bucket:", err);
    res.status(500).json({
      status: "failure",
      message: `Server error: ${err.message}`,
      sqlMessage: err.sqlMessage || "No SQL message available",
    });
  } finally {
    connection.release();
  }
});
