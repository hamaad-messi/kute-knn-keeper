import { supabase } from "@/integrations/supabase/client";

export const CATEGORIES = [
  "Web Development",
  "Graphic Design",
  "Digital Marketing",
  "MS Office",
  "AI Basics",
] as const;

export async function fetchCourses() {
  const { data, error } = await supabase.from("courses").select("*").order("created_at");
  if (error) throw error;
  return data;
}

export async function fetchCourseBySlug(slug: string) {
  const { data, error } = await supabase.from("courses").select("*").eq("slug", slug).maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchLessons(courseId: string) {
  const { data, error } = await supabase
    .from("lessons").select("*").eq("course_id", courseId).order("position");
  if (error) throw error;
  return data;
}

export async function fetchEnrollments(userId: string) {
  const { data, error } = await supabase
    .from("enrollments").select("*, courses(*)").eq("user_id", userId).order("enrolled_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function fetchProgress(userId: string) {
  const { data, error } = await supabase.from("lesson_progress").select("*").eq("user_id", userId);
  if (error) throw error;
  return data;
}

export async function fetchQuizzes() {
  const { data, error } = await supabase.from("quizzes").select("*, courses(title, slug, category)");
  if (error) throw error;
  return data;
}

export async function fetchAttempts(userId: string) {
  const { data, error } = await supabase
    .from("quiz_attempts").select("*, quizzes(title), courses(title, slug)")
    .eq("user_id", userId).order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function fetchCertificates(userId: string) {
  const { data, error } = await supabase
    .from("certificates").select("*, courses(*)").eq("user_id", userId).order("issued_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function fetchJobs() {
  const { data, error } = await supabase.from("jobs").select("*").order("posted_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function fetchApplications(userId: string) {
  const { data, error } = await supabase
    .from("applications").select("*, jobs(*)").eq("user_id", userId).order("applied_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function fetchProfile(userId: string) {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchIsAdmin(userId: string) {
  const { data, error } = await supabase
    .from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
  if (error) return false;
  return Boolean(data);
}

export async function fetchLessonsForCourses(courseIds: string[]) {
  if (courseIds.length === 0) return [];
  const { data, error } = await supabase
    .from("lessons").select("*").in("course_id", courseIds).order("position");
  if (error) throw error;
  return data;
}

export function courseProgress(
  courseId: string,
  lessons: { id: string; course_id: string }[],
  progress: { lesson_id: string }[],
) {
  const courseLessons = lessons.filter((l) => l.course_id === courseId);
  const done = courseLessons.filter((l) => progress.some((p) => p.lesson_id === l.id)).length;
  const total = courseLessons.length;
  return { done, total, percent: total === 0 ? 0 : Math.round((done / total) * 100) };
}
