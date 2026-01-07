'use client';

import { useState } from 'react';
import { Plus, Sparkles, FolderKanban } from 'lucide-react';
import Link from 'next/link';
import AiProjectModal from './AiProjectModal'; // 👈 Import the Modal
import { useProjects } from '../hooks/useProjects'; // Assuming you have this hook
import { useAuth } from '../hooks/useAuth';
import { useToast } from '@/contexts/ToastContext';

export default function ProjectsList() {
  const { projects, loading, createProject } = useProjects(); // Your existing data hook
  const { user } = useAuth();
  const toast = useToast();
  
  // 👇 State for the AI Modal
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);

  // 👇 Handler: When user accepts the AI Plan
  const handleAiAccept = async (tasks: any[]) => {
    try {
      // 1. Create a new project (You might want to ask for a title in a real app)
      const newProjectTitle = `AI Project ${new Date().toLocaleDateString()}`;
      
      // 2. Call your existing create logic
      // Note: You'll need to update your createProject API to accept 'initialTasks' if not supported yet.
      // For now, let's just log it to prove it works.
      console.log("Creating Project:", newProjectTitle);
      console.log("📋 With Tasks:", tasks);

      // TODO: Call your actual API here:
      // await createProject({ title: newProjectTitle, tasks: tasks });

      toast.success(`Successfully generated ${tasks.length} tasks!`);
      
      setIsAiModalOpen(false);
    } catch (error) {
      console.error("Failed to create project", error);
    }
  };

  if (loading) return <div>Loading projects...</div>;

  return (
    <div className="space-y-6">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Projects</h1>
          <p className="text-sm text-gray-500">Manage and track your work</p>
        </div>

        <div className="flex gap-3">
          {/* 👇 THE NEW AI BUTTON */}
          <button
            onClick={() => setIsAiModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-200 transition-colors font-medium"
          >
            <Sparkles size={18} />
            AI Planner
          </button>

          {/* Standard Create Button */}
          <button className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors font-medium">
            <Plus size={18} />
            New Project
          </button>
        </div>
      </div>

      {/* PROJECTS GRID */}
      {projects && projects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project: any) => (
            <Link 
              key={project.id} 
              href={`/projects/${project.id}`}
              className="group block p-6 bg-white rounded-xl border border-gray-200 hover:border-purple-500 hover:shadow-md transition-all"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-gray-50 rounded-lg group-hover:bg-purple-50 transition-colors">
                  <FolderKanban className="text-gray-500 group-hover:text-purple-600" size={24} />
                </div>
                <span className="text-xs font-medium px-2 py-1 bg-gray-100 rounded-full">
                  {project.tasks?.length || 0} Tasks
                </span>
              </div>
              <h3 className="font-bold text-lg text-gray-900 mb-1">{project.title || project.name}</h3>
              <p className="text-sm text-gray-500 line-clamp-2">{project.description || "No description"}</p>
            </Link>
          ))}
        </div>
      ) : (
        /* EMPTY STATE */
        <div className="text-center py-20 bg-gray-50 rounded-xl border border-dashed border-gray-300">
          <FolderKanban className="mx-auto text-gray-400 mb-4" size={48} />
          <h3 className="text-lg font-medium text-gray-900">No projects yet</h3>
          <p className="text-gray-500 mb-6">Create your first project to get started</p>
          <button 
            onClick={() => setIsAiModalOpen(true)}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium inline-flex items-center gap-2"
          >
            <Sparkles size={18} /> Try AI Generator
          </button>
        </div>
      )}

      {/* 👇 THE MODAL COMPONENT */}
      <AiProjectModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        onAccept={handleAiAccept}
      />
    </div>
  );
}