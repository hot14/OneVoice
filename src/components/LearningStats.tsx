import React, { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import { PROFICIENCY_RUBRIC } from "../lib/proficiencyRubric";

interface LearningStatsProps {
  lessons: any[];
  userProfile: any;
}

export function LearningStats({ lessons, userProfile }: LearningStatsProps) {
  // 1. Prepare data for Level Progress Chart
  const levelData = useMemo(() => {
    const data = lessons
      .map(l => ({
        date: l.completedAt?.toDate().toLocaleDateString() || "",
        level: l.diagnosedLevel || 0
      }))
      .reverse();
    
    // Add current level as the last point
    if (userProfile?.level) {
      data.push({
        date: "Current",
        level: userProfile.level
      });
    }
    return data;
  }, [lessons, userProfile]);

  // 2. Prepare data for Skills Radar/Bar Chart
  const skillData = useMemo(() => {
    const skills = userProfile?.skills || {
      vocabulary: 0,
      grammar: 0,
      pronunciation: 0,
      listening: 0
    };
    return Object.entries(skills).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value: value as number
    }));
  }, [userProfile]);

  const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444"];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Level Progress Chart */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-6">Level Progress</h3>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={levelData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                  dy={10}
                />
                <YAxis 
                  domain={[0, 10]} 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="level" 
                  stroke="#6366f1" 
                  strokeWidth={3} 
                  dot={{ r: 4, fill: '#6366f1', strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Skills Distribution Chart */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-6">Skill Mastery (EXP)</h3>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={skillData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fontWeight: 600, fill: '#475569' }}
                  width={100}
                />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={24}>
                  {skillData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Level Description Card */}
      <div className="bg-indigo-600 rounded-3xl p-8 text-white relative overflow-hidden shadow-xl shadow-indigo-100">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center text-3xl font-bold">
              {Math.floor(userProfile?.level || 1)}
            </div>
            <div>
              <h4 className="text-2xl font-bold">{PROFICIENCY_RUBRIC[Math.floor(userProfile?.level || 1)]?.title}</h4>
              <p className="text-indigo-100 text-sm opacity-80">Current Proficiency Status</p>
            </div>
          </div>
          <p className="text-lg leading-relaxed mb-6">
            {PROFICIENCY_RUBRIC[Math.floor(userProfile?.level || 1)]?.description}
          </p>
          <div className="flex flex-wrap gap-2">
            {PROFICIENCY_RUBRIC[Math.floor(userProfile?.level || 1)]?.milestones.map((m, i) => (
              <span key={i} className="bg-white/10 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-medium border border-white/10">
                ✓ {m}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
