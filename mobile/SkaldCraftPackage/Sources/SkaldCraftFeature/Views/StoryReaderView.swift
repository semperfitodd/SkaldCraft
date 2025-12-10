import SwiftUI

struct StoryReaderView: View {
    @Environment(AuthService.self) private var authService
    
    @Binding var story: Story?
    @Binding var currentNode: StoryNode?
    let onBack: () -> Void
    let onStartNewStory: () -> Void
    
    @State private var isContinuing = false
    @State private var isPolling = false
    @State private var error: Error?
    @State private var showChapterList = false
    @State private var selectedChapterIndex: Int = 0
    @State private var archivedStory: ArchivedStory?
    @State private var isLoadingArchive = false
    @State private var viewingNode: StoryNode?
    @State private var isFetchingChapter = false
    
    private var isCompleted: Bool {
        story?.status == .completed
    }
    
    private var isArchived: Bool {
        story?.isArchived == true
    }
    
    private var isEnding: Bool {
        guard let node = currentNode else { return false }
        return node.isEnding || node.choices.isEmpty
    }
    
    private var isCurrentChapter: Bool {
        guard !isArchived, let node = currentNode else { return false }
        return node.chapterIndex == selectedChapterIndex
    }
    
    private var canShowChoices: Bool {
        isCurrentChapter && !isCompleted && currentNode?.choices.isEmpty == false
    }
    
    private var currentChapterText: String {
        if isArchived, let archived = archivedStory {
            return archived.chapters.first { $0.chapterIndex == selectedChapterIndex }?.text ?? ""
        }
        if let viewing = viewingNode, viewing.chapterIndex == selectedChapterIndex {
            return viewing.text
        }
        if let node = currentNode, node.chapterIndex == selectedChapterIndex {
            return node.text
        }
        return ""
    }
    
    private var currentChapterTitle: String {
        guard let outline = story?.outline, selectedChapterIndex < outline.count else {
            return "Chapter \(selectedChapterIndex + 1)"
        }
        return outline[selectedChapterIndex].title
    }
    
    var body: some View {
        ZStack {
            backgroundGradient
            
            if let story {
                GeometryReader { geometry in
                    HStack(spacing: 0) {
                        if showChapterList && geometry.size.width > 600 {
                            chapterSidebar(story: story)
                                .frame(width: 280)
                                .transition(.move(edge: .leading))
                        }
                        
                        mainContent(story: story)
                    }
                }
            } else {
                ProgressView()
                    .tint(.white)
            }
        }
        .navigationBarBackButtonHidden(true)
        .toolbar {
            ToolbarItem(placement: .topBarLeading) {
                Button {
                    onBack()
                } label: {
                    HStack(spacing: 4) {
                        Image(systemName: "chevron.left")
                        Text("Stories")
                    }
                }
            }
            
            ToolbarItem(placement: .topBarTrailing) {
                if let outline = story?.outline, !outline.isEmpty {
                    Button {
                        withAnimation(.easeInOut(duration: 0.2)) {
                            showChapterList.toggle()
                        }
                    } label: {
                        HStack(spacing: 4) {
                            Image(systemName: showChapterList ? "sidebar.left" : "list.bullet")
                            Text("Chapters")
                                .font(.subheadline)
                        }
                    }
                }
            }
        }
        .sheet(isPresented: showChapterSheetBinding) {
            if let story {
                chapterListSheet(story: story)
            }
        }
        .alert("Error", isPresented: .constant(error != nil)) {
            Button("OK") { error = nil }
        } message: {
            Text(error?.localizedDescription ?? "Something went wrong")
        }
        .task {
            if let node = currentNode {
                selectedChapterIndex = node.chapterIndex
                viewingNode = node
            }
            // Load archived story if completed and archived
            if story?.status == .completed && story?.isArchived == true && archivedStory == nil {
                await loadArchivedStory()
            }
        }
        .onChange(of: currentNode?.nodeId) { _, _ in
            viewingNode = currentNode
        }
    }
    
    private var showChapterSheetBinding: Binding<Bool> {
        Binding(
            get: { showChapterList && UIScreen.main.bounds.width <= 600 },
            set: { showChapterList = $0 }
        )
    }
    
    private var backgroundGradient: some View {
        LinearGradient(
            colors: [.background, .backgroundMid, .backgroundLight],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
        .ignoresSafeArea()
    }
    
    @ViewBuilder
    private func chapterSidebarHeader(story: Story) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("Chapters")
                .font(.headline)
                .fontWeight(.semibold)
                .foregroundStyle(.white)
            
            Text(isCompleted ? "Completed" : "\((currentNode?.chapterIndex ?? 0) + 1) of \(story.targetNodeCount)")
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.black.opacity(0.3))
    }
    
    @ViewBuilder
    private func chapterSidebarContent(story: Story) -> some View {
        ScrollView {
            LazyVStack(spacing: 6) {
                ForEach(story.outline) { chapter in
                    chapterListItem(chapter: chapter, story: story)
                }
            }
            .padding(8)
        }
    }
    
    @ViewBuilder
    private func chapterSidebar(story: Story) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            chapterSidebarHeader(story: story)
            chapterSidebarContent(story: story)
        }
        .background(Color.black.opacity(0.25))
        .overlay(
            Rectangle()
                .fill(Color.white.opacity(0.1))
                .frame(width: 1),
            alignment: .trailing
        )
    }
    
    @ViewBuilder
    private func chapterListSheet(story: Story) -> some View {
        NavigationStack {
            List {
                ForEach(story.outline) { chapter in
                    let isAvailable = isChapterAvailable(chapter: chapter)
                    let isCurrent = chapter.chapterIndex == selectedChapterIndex
                    let isActive = !isArchived && chapter.chapterIndex == (currentNode?.chapterIndex ?? 0)
                    
                    Button {
                        if isAvailable {
                            Task {
                                await selectChapter(chapter.chapterIndex)
                                showChapterList = false
                            }
                        }
                    } label: {
                        HStack {
                            VStack(alignment: .leading, spacing: 4) {
                                Text("Chapter \(chapter.chapterIndex + 1)")
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                                
                                Text(chapter.title.replacingOccurrences(of: "Chapter \\d+:\\s*", with: "", options: .regularExpression))
                                    .font(.body)
                                    .foregroundStyle(isAvailable ? .primary : .secondary)
                            }
                            
                            Spacer()
                            
                            if isActive {
                                Text("Current")
                                    .font(.caption)
                                    .padding(.horizontal, 8)
                                    .padding(.vertical, 4)
                                    .background(Color.orange)
                                    .foregroundStyle(.white)
                                    .clipShape(Capsule())
                            } else if !isAvailable {
                                Image(systemName: "lock.fill")
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                        }
                    }
                    .disabled(!isAvailable)
                    .listRowBackground(isCurrent ? Color.orange.opacity(0.2) : Color.clear)
                }
            }
            .navigationTitle("Chapters")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") {
                        showChapterList = false
                    }
                }
            }
        }
        .presentationDetents([.medium, .large])
    }
    
    @ViewBuilder
    private func chapterListItem(chapter: OutlineChapter, story: Story) -> some View {
        let isAvailable = isChapterAvailable(chapter: chapter)
        let isCurrent = chapter.chapterIndex == selectedChapterIndex
        let isActive = !isArchived && chapter.chapterIndex == (currentNode?.chapterIndex ?? 0)
        
        Button {
            if isAvailable {
                Task { await selectChapter(chapter.chapterIndex) }
            }
        } label: {
            HStack(spacing: 10) {
                Text("\(chapter.chapterIndex + 1)")
                    .font(.caption)
                    .fontWeight(.bold)
                    .frame(width: 26, height: 26)
                    .background(isCurrent ? Color.orange : Color.white.opacity(0.15))
                    .foregroundStyle(isCurrent ? .white : .white.opacity(0.7))
                    .clipShape(Circle())
                
                VStack(alignment: .leading, spacing: 2) {
                    Text(chapter.title.replacingOccurrences(of: "Chapter \\d+:\\s*", with: "", options: .regularExpression))
                        .font(.subheadline)
                        .fontWeight(isActive ? .semibold : .regular)
                        .foregroundStyle(isAvailable ? .white : .white.opacity(0.4))
                        .lineLimit(2)
                        .multilineTextAlignment(.leading)
                    
                    if isActive && !isArchived {
                        Text("Current")
                            .font(.caption2)
                            .foregroundStyle(.orange)
                    }
                }
                
                Spacer()
                
                if !isAvailable {
                    Image(systemName: "lock.fill")
                        .font(.caption)
                        .foregroundStyle(.white.opacity(0.3))
                }
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 12)
            .background(
                RoundedRectangle(cornerRadius: 10)
                    .fill(isCurrent ? Color.orange.opacity(0.25) : Color.white.opacity(0.05))
            )
            .overlay(
                RoundedRectangle(cornerRadius: 10)
                    .stroke(isCurrent ? Color.orange.opacity(0.5) : Color.clear, lineWidth: 2)
            )
        }
        .buttonStyle(.plain)
        .disabled(!isAvailable)
        .opacity(isAvailable ? 1 : 0.5)
    }
    
    private func isChapterAvailable(chapter: OutlineChapter) -> Bool {
        if isArchived {
            return archivedStory?.chapters.contains { $0.chapterIndex == chapter.chapterIndex } ?? false
        }
        return chapter.chapterIndex <= (currentNode?.chapterIndex ?? 0)
    }
    
    @ViewBuilder
    private func mainContent(story: Story) -> some View {
        ScrollViewReader { proxy in
            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    headerSection(story: story)
                    
                    chapterHeader
                    
                    nodeContent
                    
                    if !isCurrentChapter && !isArchived {
                        returnToCurrentButton
                    }
                    
                    if isEnding && isCurrentChapter {
                        endingSection
                    } else if canShowChoices, let node = currentNode {
                        choicesSection(node: node)
                    } else if isArchived && selectedChapterIndex == (archivedStory?.chapters.count ?? 1) - 1 {
                        archivedEndingSection
                    }
                    
                    if isContinuing {
                        continuingIndicator
                    }
                }
                .padding()
                .id("top")
            }
            .onChange(of: currentNode?.nodeId) { _, _ in
                withAnimation {
                    proxy.scrollTo("top", anchor: .top)
                }
            }
            .onChange(of: selectedChapterIndex) { _, _ in
                withAnimation {
                    proxy.scrollTo("top", anchor: .top)
                }
            }
        }
    }
    
    private func headerSection(story: Story) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(story.title)
                .font(.title2)
                .fontWeight(.bold)
                .foregroundStyle(.white)
            
            HStack(spacing: 12) {
                Text(story.config.genre)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                
                Text("•")
                    .foregroundStyle(.secondary)
                
                Text(story.config.tone.label)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                
                if isCompleted {
                    Text("Completed")
                        .font(.caption)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(Color.green.opacity(0.3))
                        .foregroundStyle(.green)
                        .clipShape(Capsule())
                }
            }
        }
    }
    
    private var chapterHeader: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(currentChapterTitle)
                .font(.title3)
                .fontWeight(.semibold)
                .foregroundStyle(.white)
            
            Rectangle()
                .fill(Color.orange)
                .frame(height: 2)
                .frame(maxWidth: 100)
        }
    }
    
    private var nodeContent: some View {
        VStack(alignment: .leading, spacing: 0) {
            if isLoadingArchive || isFetchingChapter {
                ProgressView()
                    .tint(.white)
                    .frame(maxWidth: .infinity, minHeight: 200)
            } else {
                Text(currentChapterText)
                    .font(.body)
                    .lineSpacing(8)
                    .foregroundStyle(.white)
            }
        }
        .padding(20)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.white.opacity(0.1))
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(Color.white.opacity(0.1), lineWidth: 1)
        )
    }
    
    private var returnToCurrentButton: some View {
        VStack(spacing: 8) {
            Text("You are reading a previous chapter.")
                .font(.subheadline)
                .foregroundStyle(.secondary)
            
            Button {
                if let node = currentNode {
                    selectedChapterIndex = node.chapterIndex
                }
            } label: {
                Text("Return to Current Chapter")
                    .font(.headline)
            }
            .buttonStyle(.bordered)
            .tint(.orange)
        }
        .frame(maxWidth: .infinity)
        .padding()
        .background(Color.white.opacity(0.05))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
    
    private func choicesSection(node: StoryNode) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("What happens next?")
                .font(.subheadline)
                .fontWeight(.medium)
                .foregroundStyle(.secondary)
                .textCase(.uppercase)
                .tracking(0.5)
            
            ForEach(node.choices) { choice in
                ChoiceButton(
                    label: choice.label,
                    isDisabled: isContinuing
                ) {
                    Task { await continueStory(with: choice.choiceId) }
                }
            }
        }
    }
    
    private var endingSection: some View {
        VStack(spacing: 16) {
            Image(systemName: "book.closed.fill")
                .font(.system(size: 48))
                .foregroundStyle(.orange)
            
            Text("The End")
                .font(.title)
                .fontWeight(.bold)
                .foregroundStyle(.white)
            
            Text("Your story has reached its conclusion.")
                .font(.body)
                .foregroundStyle(.secondary)
            
            HStack(spacing: 12) {
                Button {
                    onBack()
                } label: {
                    Text("Back to Stories")
                        .font(.headline)
                }
                .buttonStyle(.bordered)
                .tint(.white)
                
                Button {
                    onStartNewStory()
                } label: {
                    Text("New Story")
                        .font(.headline)
                }
                .buttonStyle(.borderedProminent)
                .tint(.orange)
            }
            .padding(.top, 8)
        }
        .frame(maxWidth: .infinity)
        .padding(24)
        .background(
            LinearGradient(
                colors: [Color.orange.opacity(0.15), Color.clear],
                startPoint: .top,
                endPoint: .bottom
            )
        )
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(Color.orange.opacity(0.3), lineWidth: 1)
        )
    }
    
    private var archivedEndingSection: some View {
        VStack(spacing: 16) {
            Image(systemName: "book.closed.fill")
                .font(.system(size: 48))
                .foregroundStyle(.orange)
            
            Text("The End")
                .font(.title)
                .fontWeight(.bold)
                .foregroundStyle(.white)
            
            Text("This story has been completed. Use the chapter list to re-read any section.")
                .font(.body)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
            
            HStack(spacing: 12) {
                Button {
                    onBack()
                } label: {
                    Text("Back to Stories")
                        .font(.headline)
                }
                .buttonStyle(.bordered)
                .tint(.white)
                
                Button {
                    onStartNewStory()
                } label: {
                    Text("New Story")
                        .font(.headline)
                }
                .buttonStyle(.borderedProminent)
                .tint(.orange)
            }
            .padding(.top, 8)
        }
        .frame(maxWidth: .infinity)
        .padding(24)
        .background(
            LinearGradient(
                colors: [Color.orange.opacity(0.15), Color.clear],
                startPoint: .top,
                endPoint: .bottom
            )
        )
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(Color.orange.opacity(0.3), lineWidth: 1)
        )
    }
    
    private var continuingIndicator: some View {
        HStack(spacing: 12) {
            ProgressView()
                .tint(.orange)
            
            VStack(alignment: .leading, spacing: 2) {
                Text(isPolling ? "Generating next chapter..." : "Initiating...")
                    .font(.subheadline)
                    .foregroundStyle(.white)
                
                if isPolling {
                    Text("This may take up to a minute")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
        }
        .frame(maxWidth: .infinity)
        .padding()
        .background(Color.orange.opacity(0.15))
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(Color.orange.opacity(0.3), lineWidth: 1)
        )
    }
    
    private func loadArchivedStory() async {
        guard let idToken = authService.idToken,
              let storyId = story?.storyId else { return }
        
        isLoadingArchive = true
        
        do {
            archivedStory = try await APIService.fetchStoryArchive(idToken: idToken, storyId: storyId)
            if let chapters = archivedStory?.chapters, !chapters.isEmpty {
                selectedChapterIndex = chapters.count - 1
            }
        } catch {
            self.error = error
        }
        
        isLoadingArchive = false
    }
    
    private func continueStory(with choiceId: String) async {
        guard let idToken = authService.idToken,
              let storyId = story?.storyId,
              let currentChapterIndex = currentNode?.chapterIndex else { return }
        
        isContinuing = true
        error = nil
        
        do {
            let request = ContinueStoryRequest(choiceId: choiceId)
            let initialResponse = try await APIService.continueAdultStory(idToken: idToken, storyId: storyId, request: request)
            print("[StoryReaderView] Continue initiated: status = \(initialResponse.status)")
            
            isPolling = true
            let expectedChapter = currentChapterIndex + 1
            let fullStory = try await APIService.pollChapterReady(idToken: idToken, updatedStory: initialResponse.story, expectedChapterIndex: expectedChapter)
            
            story = fullStory.story
            currentNode = fullStory.currentNode
            viewingNode = fullStory.currentNode
            selectedChapterIndex = fullStory.currentNode.chapterIndex
        } catch {
            self.error = error
        }
        
        isContinuing = false
        isPolling = false
    }
    
    private func selectChapter(_ chapterIndex: Int) async {
        guard chapterIndex != selectedChapterIndex else { return }
        
        selectedChapterIndex = chapterIndex
        
        if isArchived, let archived = archivedStory {
            if archived.chapters.contains(where: { $0.chapterIndex == chapterIndex }) {
                viewingNode = nil
            }
            return
        }
        
        guard let idToken = authService.idToken,
              let storyId = story?.storyId,
              let currentNodeIndex = currentNode?.chapterIndex else { return }
        
        if chapterIndex == currentNodeIndex {
            viewingNode = currentNode
            return
        }
        
        if chapterIndex < currentNodeIndex {
            isFetchingChapter = true
            do {
                let chapterResponse = try await APIService.fetchStoryChapter(idToken: idToken, storyId: storyId, chapterIndex: chapterIndex)
                viewingNode = chapterResponse.node
            } catch {
                self.error = error
                viewingNode = nil
            }
            isFetchingChapter = false
        } else {
            viewingNode = nil
        }
    }
}

private struct ChoiceButton: View {
    let label: String
    let isDisabled: Bool
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            HStack {
                Text(label)
                    .font(.body)
                    .foregroundStyle(.white)
                    .multilineTextAlignment(.leading)
                
                Spacer()
                
                Image(systemName: "arrow.right")
                    .font(.body)
                    .foregroundStyle(.secondary)
            }
            .padding(16)
            .background(Color.white.opacity(0.1))
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(Color.white.opacity(0.2), lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
        .disabled(isDisabled)
        .opacity(isDisabled ? 0.6 : 1)
    }
}
