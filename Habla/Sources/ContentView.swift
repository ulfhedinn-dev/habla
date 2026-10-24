import SwiftUI

struct ContentView: View {
    @State private var selectedLanguage: Language = .spanish
    @State private var sessions: [String] = []
    @State private var showingConversation = false

    var body: some View {
        NavigationStack {
            VStack(spacing: 24) {
                Picker("Language", selection: $selectedLanguage) {
                    ForEach(Language.allCases, id: \.self) { lang in
                        Text(lang.displayName).tag(lang)
                    }
                }
                .pickerStyle(.segmented)
                .padding(.horizontal)

                if sessions.isEmpty {
                    ContentUnavailableView(
                        "No Sessions Yet",
                        systemImage: "bubble.left.and.bubble.right",
                        description: Text("Start a new conversation to practice \(selectedLanguage.displayName).")
                    )
                } else {
                    List(sessions, id: \.self) { session in
                        Text(session)
                    }
                }

                Spacer()

                Button(action: { showingConversation = true }) {
                    Label("New Conversation", systemImage: "plus.bubble")
                        .font(.headline)
                        .frame(maxWidth: .infinity)
                        .padding()
                }
                .buttonStyle(.borderedProminent)
                .padding(.horizontal)
            }
            .navigationTitle("Habla")
            .navigationDestination(isPresented: $showingConversation) {
                ConversationView(language: selectedLanguage)
            }
        }
    }
}

#Preview {
    ContentView()
}
